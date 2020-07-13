import React from 'react';
import './App.css';
import _ from "lodash"
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { result } from 'underscore';
import { aspects } from "./Data.js" // ascension data goes there

// TODO IF GOAL WAS THE LAST ASPECT AND IS T2, REPLACE IT WITH THE GENERIC T2. DONT DO THIS IF IN SELF-SUSTAIN MODE

// TODO REORDER THE DISPLAY OF EMBODIMENTS

// TODO HANDLING THE CORE

// possible minor problem: tier 2s picked in the middle of a build may have +embs we dont care about, although that's unlikely - if it picks ones with beneficial +emb then it should stumble upon a shorter path

// TODO IF POINTS BUDGET IS SET, TRY SELF-SUSTAINING WHEN WE RUN OUT OF POINTS WHILE BUILDING, TO KEEP GOING. BENCHMARK THIS WITH DOPPELGANGER @ LVL 9

// Core (Form) -> Silkworm -> Nautilus -> Doppelganger (+force) -> REMOVE NAUTILUS -> 0 1 7 0 0 total embs. it picks the +force version cuz the goals list is always ordered the same and the force variant of a t2 always goes first

const maxIterations = 2000; // how many random builds are generated and compared
const maxAspects = 15; // maximum aspects a build can have
const pointBudget = 25; // TODO IMPLEMENT

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
    var text = "";
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

    text += "Completion rewards:\n"
    for (var z in embs) {
      if (embs[z] != 0)
        text += embs[z] + " " + z.toUpperCase() + "\n";
    }

    return text;
  }

  getTooltip() {
    var name = this.props.data.name
    var cost = this.props.data.nodes;
    var rewards = this.getRewards();

    return (
      name + " ({0} nodes)".format(cost) + "\n" +
      rewards
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
      useFullCore: true,
      considerDipping: true,
      selfSustain: false,
    }
  }

  filterApplicableAspects(list) { // list is chosen aspects

    // if player chose tier 2s, replace those with generated versions. later we will discard the duplicates once one of the variants has been chosen
    var realList = [];
    for (var x = 0; x < list.length; x++) {
      var aspect = list[x];

      if (aspect.tier == 2) {
        for (var z in aspects) { // oh man this is getting tedious
          var asp = aspects[z];

          if (asp.generated != undefined)
            console.log(asp);

          if (asp.id == aspect.id && asp.generated == true) {
            realList.push(asp);
          }
        }
      }
      else {
        realList.push(aspect);
      }
    }

    console.log(realList); // error, tier 2s are not getting included
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

      reqs.life = (aspect.requirements.life > reqs.foliferce) ? aspect.requirements.life : reqs.life;
    }

    for (var x in aspects) {
      var aspect = aspects[x];

      const func = hasRelevantReward.bind(this);
      if (func(aspect, reqs)) {
        newList[x] = aspect;
      }
    }

    // make sure the aspects we have chosen don't get filtered out.
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

    var chosenAspects = {}; // turn it into object
    for (var b = 0; b < list.length; b++) {
      chosenAspects[b] = list[b];
    }

    this.setState({
      waiting: true,
    })

    return {
      reqs: reqs,
      aspects: newList,
      chosenAspects: chosenAspects,
      aspectWithHighestRequirements: aspectWithHighestRequirements,
    };
  }

  async calculate() {

    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);

    var bestBuild;

    if (Object.keys(data.chosenAspects).length == 0)
      return;

    // step 2: create random builds and save the most point-efficient one
    for (var iteration = 0; iteration < maxIterations; iteration++) {
      var aspects = data.aspects;

      console.log("New build comin' up")
      var build = [];

      var availableAspects = {}; // unnecessary? we dont edit this list
      for (var u in aspects) {
        availableAspects[u] = aspects[u]
      }

      
      for (var attempts = 0; attempts < 1000; attempts++) {

        // pick random aspect
        var aspect = _.sample(availableAspects)
        var skipRandomChoice = false;

        //CHECK IF WE MEET THE REQS FOR THE PLAYER-PICKED NODES, AND IF SO, START PUTTING THOSE IN AND IGNORE THE RANDOMLY PICKED ASPECT
        var breakThis = false;
        for (var v in data.chosenAspects) {
          if (breakThis)
            break;
          
          var chosenAspect = data.chosenAspects[v];

          if (fullfillsRequirements(build, {chosenAspect}) && !aspectAlreadyPicked(build, chosenAspect)) {
            build.push(chosenAspect)

            skipRandomChoice = true;

            console.log("picked " + chosenAspect.name + " (goal) because reqs were fulfilled")

            // if one of the goals was a t2, remove the variants of it from the list of goals
            if (chosenAspect.tier == 2) {
              var newGoals = []

              for (var z in data.chosenAspects) {
                var asp = data.chosenAspects[z];
                if (asp.id == chosenAspect.id && asp != chosenAspect) {

                }
                else {
                  newGoals.push(asp);
                }
              }

              data.chosenAspects = newGoals;

              breakThis = true;
            }

            break;
          }
        }

        if (!skipRandomChoice) {
          // choose it if we can and if we dont already have it in some way
          if (fullfillsRequirements(build, {aspect}) && !aspectAlreadyPicked(build, aspect)) {
            build.push(aspect)

            console.log("picked " + aspect.name)
          }
        }

        // check if we got all the nodes we wanted
        var allChosenNodesObtained = false;
        for (var n in data.chosenAspects) {
          if (!build.includes(data.chosenAspects[n])) {
            allChosenNodesObtained = false;
            break;
          }

          allChosenNodesObtained = true;
        }

        // break if we finished picking aspects for this build
        if (build.length >= maxAspects || allChosenNodesObtained)
          break;
      }

      console.log(build);

      var buildInfo = {
        aspects: build,
        points: getTotalPoints(build),
        totalEmbodiments: getTotalRewards(build),
      }

      // check if new build is more point-efficient
      if (bestBuild == undefined)
        bestBuild = buildInfo;
      else if (buildInfo.points < bestBuild.points)
        bestBuild = buildInfo;
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
      resultText = "Shortest path found (" + this.state.result.points + " points): ";

      for (var x in this.state.result.aspects) {
        resultText += this.state.result.aspects[x].name

        if (x != this.state.result.aspects.length - 1)
          resultText += " -> "
      }
    }

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
          <button onClick={() => this.calculate()}>Search shortest path</button>
          <p>{resultText}</p>
        </div>
      </div>
    )
  };
}

// --------- HELPER FUNCTIONS ------------

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

function fullfillsRequirements(build, aspect) {
  var embodiments = getTotalRewards(build);
  var reqs = getTotalReqs(aspect);

  for (var e in reqs) {
    if (embodiments[e] < reqs[e])
      return false;
  }

  return true;
}

function aspectAlreadyPicked(build, aspect) {
  for (var x = 0; x < build.length; x++) {
    if (build[x].id == aspect.id)
      return true;
  }

  return false;
}

export default App;
