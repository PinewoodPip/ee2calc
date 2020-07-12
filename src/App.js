import React from 'react';
import logo from './logo.svg';
import './App.css';
import _ from "lodash"

const maxIterations = 100; // how many random builds are generated and compared
const maxAspects = 15; // maximum aspects a build can have
const pointBudget = 25; // TODO IMPLEMENT

// things to consider:
// core completion, dipping into tier 2s (auto-generate separate internal aspects to facilitate that)

// iterate through every possible combination of aspects, and save the most point-cost-efficient one, then try to calculate a route to it

// REMEMBER WHEN YOU'RE PASSING AN ASPECT AS ARGUMENT, WRAP IT IN {} SO IT'S PROPERLY ITERABLE


// todo
// check if aspect amount is not enough to get all
// add point limit
// add core settings
// add dipping

// try to favor aspects with a good point to emb ratio ; for this we need to also calculate a point to emb ratio relative to the embodiments we actually want

const aspects = {
  core_force: {
    name: "The Core",
    id: "core_force",
    family: "force",
    tier: 0,
    requirements: {
    },
    rewards: {
      force: 1,
    },
    nodes: 1,
    hasChoiceNode: false,
  },
  falcon: {
    name: "Falcon",
    id: "falcon",
    family: "force",
    tier: 1,
    requirements: {
      force: 1
    },
    rewards: {
      force: 3,
      life: 2,
    },
    nodes: 5,
    hasChoiceNode: false,
  },
  hatchet: {
    name: "Hatchet",
    id: "hatchet",
    family: "force",
    tier: 1,
    requirements: {
      force: 1
    },
    rewards: {
      force: 3,
      entropy: 2,
    },
    nodes: 5,
    hasChoiceNode: false,
  },
  hornet: {
    name: "Hornet",
    id: "hornet",
    family: "force",
    tier: 1,
    requirements: {
      force: 1,
    },
    rewards: {
      force: 3,
      life: 1,
    },
    nodes: 3,
    hasChoiceNode: false,
  },
  serpent: {
    name: "Serpent",
    id: "serpent",
    family: "force",
    tier: 1,
    requirements: {
      force: 1,
    },
    rewards: {
      force: 3,
      entropy: 1,
    },
    nodes: 3,
    hasChoiceNode: false,
  },
  // FORCE TIER 2
  arcanist: {
    name: "Arcanist",
    id: "arcanist",
    family: "force",
    tier: 2,
    requirements: {
      force: 5,
      life: 1,
    },
    rewards: {
      force: 3,
    },
    nodes: 5,
    hasChoiceNode: true,
  },
  // LIFE TIER 1
  core_life: {
    name: "The Core",
    id: "core_life",
    family: "life",
    tier: 1,
    requirements: {
    },
    rewards: {
      life: 1,
    },
    nodes: 1,
    hasChoiceNode: false,
  },
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

  getRewardText() {
    var elements = [];

    for (var x in this.props.data.rewards) {
      var amount = this.props.data.rewards[x]
      var element;
      var type = x; // serves to figure out css class

      element = <div key={x} className={"embodiment " + type}><p>{amount}</p></div>
      elements.push(element);
    }

    return elements;
  }

  render() {
    return (
      <div className="aspect">
        <input type="checkbox" onChange={(e) => this.props.clickCallback(this.props.data, e)}></input>
        <p>{this.props.data.name}</p>
        <div className="embodiments-box">
          {this.getRequirementsText()}
        </div>
      </div>
    ) // todo display rewards somewhere, maybe in tooltips
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selection: [],
      result: "",
    }
  }

  filterApplicableAspects(list) { // list is chosen aspects
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

        // if an aspect rewards a type of embodiment we need, it's valid
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

      if (hasRelevantReward(aspect, reqs)) {
        newList[x] = aspect;
      }
    }

    // make sure the aspects we have chosen don't get filtered out
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

    return {
      reqs: reqs,
      aspects: newList,
      chosenAspects: chosenAspects,
      aspectWithHighestRequirements: aspectWithHighestRequirements,
    };
  }

  // what we did to break it: changed aspect to be chosen randomly and removed brackets from alreadypicked check
  calculate() {
    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);

    var bestBuild;

    // start a new build
    for (var iteration = 0; iteration < maxIterations; iteration++) {
      var aspects = data.aspects; // CAREFUL WE WERE ACCIDENTALLY ONLY INCLUDING THE ONES THE PLAYER CHECKED

      console.log("new build")
      var build = [];

      var availableAspects = {}; // todo shuffle or pick random key
      for (var u in aspects) {
        availableAspects[u] = aspects[u]
      }

      
      for (var attempts = 0; attempts < 1000; attempts++) {
        // pick random aspect
        var aspect = _.sample(availableAspects)
        var skipRandomChoice = false;

        //CHECK IF WE MEET THE REQS FOR THE PLAYER-PICKED NODES, AND IF SO, START PUTTING THOSE IN AND IGNORE THE NEXT IF CODE BLOCK
        for (var v in data.chosenAspects) {
          var chosenAspect = data.chosenAspects[v];

          if (fullfillsRequirements(build, {chosenAspect}) && !aspectAlreadyPicked(build, chosenAspect)) {
            build.push(chosenAspect)

            skipRandomChoice = true;

            console.log("picked " + chosenAspect.name + " because reqs were fullfilled")

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
  }

  updateSelection(aspect, e) {
    const checked = e.target.checked;
    var selection = this.state.selection.slice();
    //console.log(aspect.name + " -> " + e.target.checked)

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

    for (var x in aspects) {
      var aspect = aspects[x];

      var element = <Aspect 
      data={aspect}
      key={x}
      clickCallback={this.updateSelection.bind(this)}
      />

      switch (aspect.family) {
        case "force":
          forceAspects.push(element);
          break;
        case "entropy":
          entropyAspects.push(element);
          break;
        case "form":
          formAspects.push(element);
          break;
        case "inretia":
          inertiaAspects.push(element);
          break;
        case "life":
          lifeAspects.push(element);
          break;
        default:
          console.log("Erroneous aspect " + aspect.name)
          break;
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
        <button onClick={() => this.calculate()}>Calulate shortest path</button>
        <p>{this.state.result}</p>
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
    //console.log(x) // this prints the property names of an aaspect...
    var aspect = aspects[x];

    for (var r in aspect.rewards) {
      rewards[r] += aspect.rewards[r];
    }
  }

  return rewards;
}

// previously we were checking the reqs for the build WITH THE ASPECT ALREADY IN. dont do that
function fullfillsRequirements(build, aspect) {
  var embodiments = getTotalRewards(build);
  var reqs = getTotalReqs(aspect);

  // console.log(reqs) // erorr
  // console.log(embodiments)

  for (var e in reqs) {
    if (embodiments[e] < reqs[e])
      return false;
  }

  return true;
}

function aspectAlreadyPicked(build, aspect) {
  for (var x = 0; x < build.length; x++) {
    //console.log(aspect) // odd??
    if (build[x].id == aspect.id)
      return true;
  }

  return false;
}

export default App;
