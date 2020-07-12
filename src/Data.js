export const aspects = {
    core_force: {
      name: "Core (Force)",
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
    archer: {
      name: "Archer",
      id: "archer",
      family: "force",
      tier: 2,
      requirements: {
        force: 3,
        entropy: 2,
        life: 1,
      },
      rewards: {
        force: 2,
        entropy: 1,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    manticore: {
      name: "Manticore",
      id: "manticore",
      family: "force",
      tier: 2,
      requirements: {
        force: 5,
        entropy: 1,
      },
      rewards: {
        force: 3,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    scorpion: {
      name: "Scorpion",
      id: "scorpion",
      family: "force",
      tier: 2,
      requirements: {
        force: 4,
        entropy: 2,
      },
      rewards: {
        force: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    tiger: {
      name: "Tiger",
      id: "tiger",
      family: "force",
      tier: 2,
      requirements: {
        force: 4,
        life: 2,
      },
      rewards: {
        force: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    // FORCE TIER 3
    conqueror: {
      name: "Conqueror",
      id: "conqueror",
      family: "force",
      tier: 3,
      requirements: {
        force: 7,
        entropy: 1,
        life: 5,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    kraken: {
      name: "Kraken",
      id: "kraken",
      family: "force",
      tier: 3,
      requirements: {
        force: 7,
        entropy: 5,
        life: 1,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    wrath: {
      name: "Wrath",
      id: "wrath",
      family: "force",
      tier: 3,
      requirements: {
        force: 8,
        entropy: 3,
        life: 2,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    // ENTROPY TIER 1
    core_entropy: {
      name: "Core (Entropy)",
      id: "core_entropy",
      family: "entropy",
      tier: 1,
      requirements: {
      },
      rewards: {
        entropy: 1,
      },
      nodes: 1,
      hasChoiceNode: false,
    },
    crow: {
      name: "Crow",
      id: "crow",
      family: "entropy",
      tier: 1,
      requirements: {
        entropy: 1,
      },
      rewards: {
        entropy: 3,
        form: 1,
      },
      nodes: 3,
      hasChoiceNode: false,
    },
    fly: {
      name: "Fly",
      id: "fly",
      family: "entropy",
      tier: 1,
      requirements: {
        entropy: 1,
      },
      rewards: {
        entropy: 3,
        form: 2,
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    vulture: {
      name: "Vulture",
      id: "vulture",
      family: "entropy",
      tier: 1,
      requirements: {
        entropy: 1,
      },
      rewards: {
        entropy: 3,
        force: 2,
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    wolf: {
      name: "Wolf",
      id: "wolf",
      family: "entropy",
      tier: 1,
      requirements: {
        entropy: 1,
      },
      rewards: {
        entropy: 3,
        force: 1,
      },
      nodes: 3,
      hasChoiceNode: false,
    },
    // ENTROPY TIER 2
    blood_ape: {
      name: "Blood Ape",
      id: "blood_ape",
      family: "entropy",
      tier: 2,
      requirements: {
        force: 1,
        entropy: 3,
        form: 2,
      },
      rewards: {
        entropy: 2,
        force: 1,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    extinction: {
      name: "Extinction",
      id: "extinction",
      family: "entropy",
      tier: 2,
      requirements: {
        force: 2,
        entropy: 4,
      },
      rewards: {
        entropy: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    imp: {
      name: "Imp",
      id: "imp",
      family: "entropy",
      tier: 2,
      requirements: {
        entropy: 5,
        form: 1,
      },
      rewards: {
        entropy: 3,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    hyena: {
      name: "Hyena",
      id: "hyena",
      family: "entropy",
      tier: 2,
      requirements: {
        force: 1,
        entropy: 5,
      },
      rewards: {
        entropy: 3,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    supplicant: {
      name: "Supplicant",
      id: "wolf",
      family: "entropy",
      tier: 2,
      requirements: {
        entropy: 4,
        form: 2,
      },
      rewards: {
        entropy: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    // ENTROPY TIER 3
    death: {
      name: "Death",
      id: "death",
      family: "entropy",
      tier: 3,
      requirements: {
        force: 2,
        entropy: 8,
        form: 3,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    decay: {
      name: "Decay",
      id: "decay",
      family: "entropy",
      tier: 3,
      requirements: {
        force: 5,
        entropy: 7,
        form: 1,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    demilich: {
      name: "Demilich",
      id: "demilich",
      family: "entropy",
      tier: 3,
      requirements: {
        force: 1,
        entropy: 7,
        form: 5,
      },
      rewards: {
      },
      nodes: 6,
      hasChoiceNode: false,
    },
    // FORM TIER 1
    core_form: {
      name: "Core (Form)",
      id: "core_form",
      family: "form",
      tier: 1,
      requirements: {
      },
      rewards: {
        form: 1,
      },
      nodes: 1,
      hasChoiceNode: false,
    },
    chalice: { // consume the cum chalice
      name: "Chalice",
      id: "chalice",
      family: "form",
      tier: 1,
      requirements: {
        form: 1,
      },
      rewards: {
        form: 3,
        inertia: 2,
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    key: {
      name: "Key",
      id: "key",
      family: "form",
      tier: 1,
      requirements: {
        form: 1,
      },
      rewards: {
        form: 3,
        entropy: 2,
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    nautilus: {
      name: "Nautilus",
      id: "nautilus",
      family: "form",
      tier: 1,
      requirements: {
        form: 1,
      },
      rewards: {
        form: 3,
        inertia: 1,
      },
      nodes: 3,
      hasChoiceNode: false,
    },
    silkworm: {
      name: "Silkworm",
      id: "silkworm",
      family: "form",
      tier: 1,
      requirements: {
        form: 1,
      },
      rewards: {
        form: 3,
        entropy: 1,
      },
      nodes: 3,
      hasChoiceNode: false,
    },
    // FORM TIER 2
    basilisk: {
      name: "Basilisk",
      id: "basilisk",
      family: "form",
      tier: 2,
      requirements: {
        form: 4,
        entropy: 2,
      },
      rewards: {
        form: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    doppelganger: {
      name: "Doppelganger",
      id: "doppelganger",
      family: "form",
      tier: 2,
      requirements: {
        form: 5,
        entropy: 1,
      },
      rewards: {
        form: 3,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    dragon: {
      name: "Dragon",
      id: "dragon",
      family: "form",
      tier: 2,
      requirements: {
        form: 5,
        inertia: 1,
      },
      rewards: {
        form: 3,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    gryphon: {
      name: "Gryphon",
      id: "gryphon",
      family: "form",
      tier: 2,
      requirements: {
        form: 4,
        inertia: 2,
      },
      rewards: {
        form: 2,
      },
      nodes: 4,
      hasChoiceNode: true,
    },
    wealth: {
      name: "Wealth",
      id: "wealth",
      family: "form",
      tier: 2,
      requirements: {
        inertia: 2,
        form: 3,
        entropy: 1,
      },
      rewards: {
        form: 2,
        inertia: 1,
      },
      nodes: 5,
      hasChoiceNode: true,
    },
    // FORM TIER 3
    cerberus: {
      name: "Cerberus",
      id: "cerberus",
      family: "form",
      tier: 3,
      requirements: {
        inertia: 5,
        form: 7,
        entropy: 1,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    ritual: {
      name: "Ritual",
      id: "ritual",
      family: "form",
      tier: 3,
      requirements: {
        inertia: 1,
        form: 7,
        entropy: 5,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    sphinx: {
      name: "Sphinx",
      id: "sphinx",
      family: "form",
      tier: 3,
      requirements: {
        inertia: 3,
        form: 8,
        entropy: 2,
      },
      rewards: {
      },
      nodes: 5,
      hasChoiceNode: false,
    },
    // LIFE TIER 1
    core_life: {
      name: "Core (Life)",
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