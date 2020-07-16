import React from 'react';
import './App.css';
import _ from "lodash"
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { aspects } from "./Data.js" // ascension data goes there

// TODO IF GOAL WAS THE LAST ASPECT AND IS T2, REPLACE IT WITH THE GENERIC T2. DONT DO THIS IF IN SELF-SUSTAIN MODE

// TODO REORDER THE DISPLAY OF EMBODIMENTS

// TODO ADD TOOLTIPS TO SETTINGS

// possible minor problem: tier 2s picked in the middle of a build may have +embs we dont care about, although that's unlikely - if it picks ones with beneficial +emb then it should stumble upon a shorter path

// TODO IF POINTS BUDGET IS SET, TRY SELF-SUSTAINING WHEN WE RUN OUT OF POINTS WHILE BUILDING, TO KEEP GOING. BENCHMARK THIS WITH DOPPELGANGER @ LVL 9

// Core (Form) -> Silkworm -> Nautilus -> Doppelganger (+force) -> REMOVE NAUTILUS -> 0 1 7 0 0 total embs. it picks the +force version cuz the goals list is always ordered the same and the force variant of a t2 always goes first

// TODO REPORT TIED BUILDS

String.prototype.format = function () { // by gpvos from stackoverflow
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function (m, n) { return args[n]; });
};


// things to consider:
// core completion, dipping into tier 2s (auto-generate separate internal aspects to facilitate that)

// REMEMBER WHEN YOU'RE PASSING AN ASPECT AS ARGUMENT, WRAP IT IN {} SO IT'S PROPERLY ITERABLE


// todo
// check if aspect amount is not enough to get all
// add point limit
// add core settings
// add dipping

// try to favor aspects with a good point to emb ratio ; for this we need to also calculate a point to emb ratio relative to the embodiments we actually want

// generate a new "internal" aspect for each tier 2 aspect, one for each different embodiment rewards you can choose in node 2.
var num = 999; // object key for these aspects, starts at high number to uhm... avoid any problems
var extraAspects = {};
for (var x in aspects) {
  var aspect = aspects[x];

  if (aspect.tier == 2) {
    var embs = {
      force: 1,
      entropy: 1,
      form: 1,
      inertia: 1,
      life: 1,
    }

    for (var z in embs) {
      var newAspect = {
        name: aspect.name + " (+{0})".format(z),
        id: aspect.id, // same id so the calc function doesnt pick multiple
        family: "special",
        tier: aspect.tier,
        requirements: aspect.requirements, // does this reference or copy??
        rewards: {},
        // rewards: {
        //   force: (aspect.rewards.force != undefined) ? aspect.rewards.force : undefined,
        //   entropy: aspect.rewards.entropy,
        //   form: aspect.rewards.form,
        //   inertia: aspect.rewards.inertia,
        //   life: aspect.rewards.life,
        // },
        nodes: aspect.nodes,
        hasChoiceNode: aspect.hasChoiceNode,
        generated: true, // if this property exists, aspect does not render in UI
        extraEmbodimentType: z,
      };

      for (var v in aspect.rewards) {
        newAspect.rewards[v] = aspect.rewards[v];
      }

      if (newAspect.rewards[z] == undefined)
        newAspect.rewards[z] = 1;
      else
        newAspect.rewards[z] += embs[z]; // add +1 embodiment

      num++;

      extraAspects[num] = newAspect;
    }
  }
}

for (var x in extraAspects) { // gotta do this here because we cannot change an object while we're iterating through it
  aspects[x] = extraAspects[x];
}

// calculate embodiments rewarded per Ascension point spent
for (var x in aspects) {
  var aspect = aspects[x];
  aspect.rewardsPerPoint = {};
  aspect.totalRequirements = 0;

  for (var y in aspect.rewards) {
    aspect.rewardsPerPoint[y] = aspect.rewards[y] / aspect.nodes
  }

  // total embodiment req
  for (var z in aspect.requirements) {
    aspect.totalRequirements += aspect.requirements[z];
  }
}



// generate "dipping" aspects for tier 2s, which only have 2 nodes, up until the one that gives an embodiment
// TODO

class Aspect extends React.Component {
  getRequirementsText() {
    var elements = [];

    for (var x in this.props.data.requirements) {
      var amount = this.props.data.requirements[x]
      var element;
      var type = x; // serves to figure out css class

      element = <div key={x} className={"embodiment " + type}><p>{amount}</p></div>
      elements.push(element);
    }

    return elements;
  }

  getRewards() {
    var text = [];
    var embs = {
      force: 0,
      entropy: 0,
      form: 0,
      inertia: 0,
      life: 0,
    }

    for (var x in this.props.data.rewards) {
      var amount = this.props.data.rewards[x]
      embs[x] = amount;
    }

    // don't even show the header for tier 3 aspects
    var header = (this.props.data.tier != 3) ? "Completion rewards:" : "";
    for (var z in embs) {
      if (embs[z] != 0)
        text.push(<p key={this.props.data.name + "_tooltip_" + z}>{embs[z] + " " + z.toUpperCase()}</p>);
    }

    return <div>
      <p>{header}</p>
      <div>{text}</div>
    </div>;
  }

  getTooltip() {
    var name = this.props.data.name
    var cost = this.props.data.nodes;
    var rewards = this.getRewards();
    var nodeText = ((this.props.data.nodes > 1) ? " ({0} nodes)" : " ({0} node)").format(cost)
    
    // note to self, dont nest <p> elements accidentally
    return (<div className="tooltip">
        <p className="tooltip">{name + nodeText}<br /></p>
        {rewards}
      </div>
    );
  }

  render() {
    return (
      <Tippy content={this.getTooltip()} placement="bottom" duration="0">
        <div className="aspect">
          <input type="checkbox" onChange={(e) => this.props.clickCallback(this.props.data, e)}></input>
          <p>{this.props.data.name}</p>
          <div className="embodiments-box">
            {this.getRequirementsText()}
          </div>
        </div>
      </Tippy>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selection: [],
      result: null,
      waiting: false,
      useFullCore: false,
      considerDipping: true,
      selfSustain: true,
      pointsBudget: 25, // unused atm
      preference: "0", // scoring mode
      iterations: 5000, // how many random builds are generated and compared
    }
  }

  filterApplicableAspects(list) { // list is chosen aspects

    // if player chose tier 2s, replace those with generated versions. later we will discard the duplicates once one of the variants has been chosen
    var realList = [];
    for (var x = 0; x < list.length; x++) { // this works
      var aspect = list[x];

      if (aspect.tier == 2) {
        for (var z in aspects) {
          var asp = aspects[z];

          if (asp.id == aspect.id && asp.generated == true) {
            realList.push(asp);
          }
        }
      }
      else {
        realList.push(aspect);
      }
    }

    //console.log(realList);
    list = realList;

    var newList = {}
    var reqs = {
      force: 0,
      entropy: 0,
      form: 0,
      inertia: 0,
      life: 0,
    }

    function hasRelevantReward(aspect, reqs) {
      for (var x in aspect.rewards) {
        var reward = aspect.rewards[x];

        // !!! always ignore base tier 2s !!!, use only the generated versions, which have the +embodiment node considered
        if (aspect.tier == 2 && aspect.generated == undefined)
          return false;

        // core handling. (do we need handling for the edge case where the calc chooses all 5 cores in non-core mode? probably. TODO)
        if (aspect.id == "core_full" && !this.state.useFullCore)
          return false;
        else if (aspect.isCoreNode && this.state.useFullCore)
          return false;
        // else if (aspect.isCoreNode == undefined)
        //   realList.push(aspect);

        // filter out t2 variants that don't have a relevant +emb
        if (aspect.generated != undefined && reqs[aspect.extraEmbodimentType] == 0)
          return false;

        // if an aspect rewards a type of embodiment we need, it's valid. Otherwise we discard it
        if (reward > 0 && reqs[x] > 0)
          return true;
      }

      return false;
    }

    // check what embodiment types we need
    for (var z in list) {
      var aspect = list[z];

      reqs.force = (aspect.requirements.force > reqs.force) ? aspect.requirements.force : reqs.force;

      reqs.entropy = (aspect.requirements.entropy > reqs.entropy) ? aspect.requirements.entropy : reqs.entropy;

      reqs.form = (aspect.requirements.form > reqs.form) ? aspect.requirements.form : reqs.form;

      reqs.inertia = (aspect.requirements.inertia > reqs.inertia) ? aspect.requirements.inertia : reqs.inertia;

      reqs.life = (aspect.requirements.life > reqs.life) ? aspect.requirements.life : reqs.life;
    }

    for (var x in aspects) {
      var aspect = aspects[x];

      const func = hasRelevantReward.bind(this);
      if (func(aspect, reqs)) {
        newList[x] = aspect;
      }
    }

    // make sure the aspects we have chosen don't get filtered out.
    // note to self: how the fuck does this avoid base t2s?
    for (var y in list) {
      if (!newList.hasOwnProperty(list[y].id))
        newList[list[y].id] = list[y];
    }

    var highestReq = 0;
    var aspectWithHighestRequirements;

    for (var i in newList) {
      if (newList[i].totalRequirements > highestReq)
        aspectWithHighestRequirements = newList[i];
    }

    var chosenAspects = {}; // turn it into object and filter out irrelevant t2 variants
    for (var b = 0; b < list.length; b++) {
      var asp = list[b]
      if (asp.generated != undefined && reqs[asp.extraEmbodimentType] == 0) {
        console.log("unneeded " + asp.name)
      }
      else
        chosenAspects[b] = list[b];
    }

    this.setState({
      waiting: true,
    })

    return { // this works
      reqs: reqs,
      aspects: newList,
      chosenAspects: chosenAspects,
      aspectWithHighestRequirements: aspectWithHighestRequirements,
    };
  }

  async calculate() {

    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);
    console.log(data.chosenAspects)

    var bestBuilds = []; // todo
    var bestBuild;

    // quit if nothing was selected
    if (Object.keys(data.chosenAspects).length == 0)
      return;

    // IT'S IN THE LOOPS AFTER 1 THAT CHOSENASPECTS GETS FUCKED. i changed .data.aspects in the newgoals loop. now it doesnt work for t2s
    // step 2: create random builds and save the most point-efficient one
    for (var iteration = 0; iteration < this.state.iterations; iteration++) {
      var aspects = data.aspects;
      var chosenAspects = [] // we "shuffle" this.
      for (var x in data.chosenAspects) {
        chosenAspects.push(data.chosenAspects[x]);
      }
      shuffle(chosenAspects);

      var build = [];

      var availableAspects = {}; // unnecessary? we dont edit this list
      for (var u in aspects) {
        availableAspects[u] = aspects[u]
      }

      var failed = false;
      for (var attempts = 0; attempts < 2000; attempts++) {

        // pick random aspect
        var aspect = _.sample(availableAspects) // is this the problem? do force t2 ones take priority here or something?
        var skipRandomChoice = false;

        //CHECK IF WE MEET THE REQS FOR THE PLAYER-PICKED NODES, AND IF SO, START PUTTING THOSE IN AND IGNORE THE RANDOMLY PICKED ASPECT
        var breakThis = false;
        for (var v in chosenAspects) {
          if (breakThis)
            break;
          
          var chosenAspect = chosenAspects[v]

          if (fullfillsRequirements(build, {chosenAspect}) && !aspectAlreadyPicked(build, chosenAspect)) {
            build.push(chosenAspect)

            skipRandomChoice = true;

            console.log("picked " + chosenAspect.name + " (goal) because reqs were fulfilled")

            // if one of the goals was a t2, remove the variants of it from the list of goals
            if (chosenAspect.tier == 2) {
              var newGoals = []

              for (var z in chosenAspects) {
                var asp = chosenAspects[z];
                if (asp.id == chosenAspect.id && asp != chosenAspect) {
                  console.log("removed " + asp.name)
                }
                else {
                  newGoals.push(asp);
                }
              }

              chosenAspects = newGoals;

              breakThis = true; // can we just replace this with break?
            }

            break;
          }
        }

        if (!skipRandomChoice) {
          // choose it if we can and if we dont already have it in some way (relevant for t2s)
          if (fullfillsRequirements(build, {aspect}) && !aspectAlreadyPicked(build, aspect)) {
            build.push(aspect)

            console.log("picked " + aspect.name)
          }
        }

        // check if we got all the nodes we wanted
        // var allChosenNodesObtained = false;
        // for (var n in data.chosenAspects) {
        //   if (!build.includes(data.chosenAspects[n])) {
        //     allChosenNodesObtained = false;
        //     break;
        //   }

        //   allChosenNodesObtained = true;
        // }
        var allChosenNodesObtained = false;
        for (var n in chosenAspects) {
          if (!build.includes(chosenAspects[n])) {
            allChosenNodesObtained = false;
            break;
          }

          allChosenNodesObtained = true;
        }

        // self-sustaining
        // TODO MAKE IT TRY TO REMOVE THE MOST COSTLY ONES FIRST - to do this. first make an ordered list of aspects from most costly to cheapest
        // we need to restart the loop after finding one, else it's gonna potentially remove multiple that you wouldnt normally be able to remove, right??
        var aspectsToRemove = [];
        var filteredBuild = build;
        if (allChosenNodesObtained && this.state.selfSustain) {
          for (var x = 0; x < build.length; x++) {
            var asp = build[x];
            var buildWithoutThat = filteredBuild.filter(function(val) {return val != asp });

            if (fullfillsRequirements(buildWithoutThat) && !isInObject(asp, data.chosenAspects) && filteredBuild.includes(asp)) {
              aspectsToRemove.push(asp);
              filteredBuild = filteredBuild.filter(function(val) {return val != asp });
            }
          }
        }

        // break if we finished picking aspects for this build
        // note this used to have a || maxaspectsreached check
        if (allChosenNodesObtained)
          break;
      }

      // < ! > Sometimes a build comes up with 0 aspects and points. I assume this happens when the find-aspects loop has finished and somehow, miraculously, all ~2000 attempts to find a starting point for the build have failed.
      if (build.length != 0) {
        console.log(build);
        var pointsToReach = getTotalPoints(build);
        var pointsToSustain = getTotalPoints(filteredBuild)

        var buildInfo = {
          aspects: build,
          aspectsToRemove: aspectsToRemove,
          points: pointsToReach,
          finalCost: pointsToSustain,
          score: pointsToReach + pointsToSustain + ((this.state.preference == "0") ? 0 : build.length), // less aspects = better, discourages needlessly picking builds only to despec them later
          totalEmbodiments: getTotalRewards(build),
        }

        // check if new build is more point-efficient or tied, in which case we keep both tracked
        if (bestBuild == undefined)
          bestBuild = buildInfo;
        else if (buildInfo.score < bestBuild.score && buildInfo.points <= this.state.pointsBudget) // favoring finalCost doesnt really work, it picks 50-point builds
          bestBuild = buildInfo;
        // if (bestBuilds.length == 0)
        //   bestBuilds.push(buildInfo);
        // else if (buildInfo.points < bestBuilds[0].points)
        //   bestBuilds = [buildInfo];
        // else if (buildInfo.points == bestBuilds[0].points) {
        //   bestBuilds.push(buildInfo)
        // }
      }
    }

    console.log("--- Best Build ---")
    console.log(bestBuild);

    this.setState({
      result: bestBuild,
      waiting: false,
    })
  }

  // add/remove aspects to the list of aspects we want to calculate, called by the checkboxes
  updateSelection(aspect, e) {
    const checked = e.target.checked;
    var selection = this.state.selection.slice();

    if (!selection.includes(aspect))
      selection.push(aspect);
    else
      selection = selection.filter(function(val, index, arr){ return val != aspect })

    this.setState({
      selection: selection
    })
  }

  render() {
    var forceAspects = [];
    var entropyAspects = [];
    var formAspects = [];
    var inertiaAspects = [];
    var lifeAspects = [];
    var resultText = ""

    if (this.state.waiting)
      resultText = "" // removed, didnt work properly anyways
    else if (this.state.result != null) {
      //resultText += "(mode {0})".format(this.state.preference);
      if (this.state.result.points != this.state.result.finalCost)
        resultText += "Shortest path found ({0} points to reach, {1} points after self-sustaining): ".format(this.state.result.points, this.state.result.finalCost);
      else
      resultText += "Shortest path found ({0} points to reach): ".format(this.state.result.points);

      for (var x in this.state.result.aspects) {
        resultText += this.state.result.aspects[x].name

        if (x != this.state.result.aspects.length - 1 || !this.state.result.aspectsToRemove.length == 0)
          resultText += " -> "
      }

      for (var z in this.state.result.aspectsToRemove) {
        resultText += " ❌ " + this.state.result.aspectsToRemove[z].name

        if (z != this.state.result.aspectsToRemove.length - 1)
          resultText += " -> "
      }
    }
    // else if (this.state.result != null) {
    //   resultText += <p>Shortest path(s) found:</p>
    //   for (var x = 0; x < this.state.result.length; x++) {
    //     var build = this.state.results[x];
    //     var buildText = "";

    //     for (var z = 0; z < build.aspects.length; z++) {
    //       buildText += build.aspects[z].name;

    //       if (z != build.aspects.length - 1)
    //         buildText += " -> ";
    //     }

    //     resultText += <p>{buildText}</p>
    //   }
    //}

    // aspect elements
    for (var x in aspects) {
      var aspect = aspects[x];
      var currentAspect;

      var element = <Aspect 
      data={aspect}
      key={x}
      clickCallback={this.updateSelection.bind(this)}
      />

      var hr = <hr key={x + "_hr"}></hr>;

      if (aspect.generated == undefined) { // don't display "technical" aspects
        switch (aspect.family) {
          case "force":
            currentAspect = forceAspects;
            break;
          case "entropy":
            currentAspect = entropyAspects;
            break;
          case "form":
            currentAspect = formAspects;
            break;
          case "inertia":
            currentAspect = inertiaAspects;
            break;
          case "life":
            currentAspect = lifeAspects;
            break;
          default:
            break;
        }
      }

      if (currentAspect != undefined) {
        if (currentAspect != undefined && currentAspect.generated == undefined)
          currentAspect.push(element);

        var aspectsAfterWhichWePutAnHrSoThingsLookNice = [
          "core_force",
          "serpent",
          "tiger",
          "core_entropy",
          "wolf",
          "supplicant",
          "core_form",
          "silkworm",
          "wealth",
          "core_inertia",
          "guardsman",
          "rhinoceros",
          "core_life",
          "rabbit",
          "stag",
        ]
        if (aspectsAfterWhichWePutAnHrSoThingsLookNice.includes(aspect.id) && currentAspect.generated == undefined)
          currentAspect.push(hr);
        }
    }

    return (
      <div>
        <div className="table">
          <div className="aspect-column">
            {forceAspects}
          </div>
          <div className="aspect-column">
            {entropyAspects}
          </div>
          <div className="aspect-column">
            {formAspects}
          </div>
          <div className="aspect-column">
            {inertiaAspects}
          </div>
          <div className="aspect-column">
            {lifeAspects}
          </div>
        </div>
        <div className="bottom-interface">
          <div className="num-input">
            <p>Builds to try:</p>
            <input type="val" value={this.state.iterations} onChange={(e) => this.setState({iterations: e.target.value})}></input>
          </div>
          <div className="checkbox-bottom-ui">
            <input type="checkbox" checked={this.state.useFullCore} onChange={(e) => this.setState({useFullCore: e.target.checked})}></input>
            <p>Use a full Core</p>
          </div>
          <div className="checkbox-bottom-ui">
            <input type="checkbox" checked={this.state.selfSustain} onChange={(e) => this.setState({selfSustain: e.target.checked})}></input>
            <p>Self-sustain</p>
          </div>
          <div className="dropdown">
            <select onChange={(e) => this.setState({preference: e.target.value})}>
              <option value="0">Prefer builds with lower final cost</option>
              <option value="1">Prefer builds with fewer points needed to reach</option>
            </select>
          </div>
          <button onClick={() => this.calculate()}>Search shortest path</button>
          <p>{resultText}</p>
        </div>
      </div>
    )
  };
}

// --------- HELPER FUNCTIONS ------------

function shuffle(array) { // https://stackoverflow.com/a/2450976
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function isInObject(thing, obj) {
  for (var x in obj) {
    if (obj[x] == thing)
      return true
  }
  return false;
}

function getTotalPoints(build) {
  var points = 0;
  for (var x = 0; x < build.length; x++) {
    points += build[x].nodes;
  }

  return points;
}

function mergeIntoObject(build, aspect) {
  var newList = {};
  for (var x = 0; x < build.length; x++) {
    newList[x] = build[x];
  }
  newList[aspect.id] = aspect;

  return newList;
}

function randomProp(obj) {
  var keys = Object.keys(obj);
  return obj[keys[ keys.length * Math.random() << 0]];
};

// gets the highest requirement for each embodiment on a build
function getTotalReqs(aspects) {
  var embodiments = {
    force: 0,
    entropy: 0,
    form: 0,
    inertia: 0,
    life: 0,
  };

  for (var x in aspects) {
    var aspect = aspects[x];

    for (var z in aspect.requirements) {
      if (aspect.requirements[z] > embodiments[z])
        embodiments[z] = aspect.requirements[z]
    }
  }

  return embodiments;
}

function getTotalRewards(aspects) {
  var rewards = {
    force: 0,
    entropy: 0,
    form: 0,
    inertia: 0,
    life: 0,
  };

  for (var x in aspects) {
    var aspect = aspects[x];

    for (var r in aspect.rewards) {
      rewards[r] += aspect.rewards[r];
    }
  }

  return rewards;
}

function fullfillsRequirements(build, aspect=null) {
  if (aspect != null) {
    var embodiments = getTotalRewards(build);
    var reqs = getTotalReqs(aspect);

    for (var e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
  else {
    var embodiments = getTotalRewards(build);
    var reqs = getTotalReqs(build);

    for (var e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
}

function aspectAlreadyPicked(build, aspect) {
  for (var x = 0; x < build.length; x++) {
    if (build[x].id == aspect.id)
      return true;
  }

  return false;
}

export default App;
