import { Topic, SettingsTreeNodes, SettingsTreeFields, SettingsTreeAction } from "@foxglove/extension";
// import memoizeWeak from "memoize-weak"
import { produce } from "immer";
import _ from "lodash-es";

// Parameters for each gait type (MPC mode)
export type ModeSchedule = {
    label: string;
    name: string;
    eventTimes: number[];
    modeSequence: number[];
};

export const DEFAULT_MODE_SCHEDULE: ModeSchedule[] = [
    {
        label: "Stance",
        name: "stance",
        eventTimes: [0.0, 0.5],
        modeSequence: [15],
    },
    {
        label: "Trot",
        name: "trot",
        eventTimes: [0.0, 0.3, 0.6],
        modeSequence: [9, 6]
    },
    {
        label: "Standing trot",
        name: "standing_trot",
        eventTimes: [0.0, 0.25, 0.3, 0.55, 0.6],
        modeSequence: [9, 15, 6, 15]
    },
    {
        label: "Flying trot",
        name: "flying_trot",
        eventTimes: [0.0, 0.15, 0.2, 0.35, 0.4],
        modeSequence: [9, 0, 6, 0]
    },
    {
        label: "Pace",
        name: "pace",
        eventTimes: [0.0, 0.28, 0.3, 0.58, 0.6],
        modeSequence: [10, 0, 5, 0]
    },
    {
        label: "Standing pace",
        name: "standing_pace",
        eventTimes: [0.0, 0.3, 0.35, 0.65, 0.7],
        modeSequence: [10, 15, 5, 15]
    },
    {
        label: "Dynamic walk",
        name: "dynamic_walk",
        eventTimes: [0.0, 0.2, 0.3, 0.5, 0.7, 0.8, 1.0],
        modeSequence: [13, 5, 7, 14, 10, 11]
    },
    {
        label: "Static walk",
        name: "static_walk",
        eventTimes: [0.0, 0.3, 0.6, 0.9, 1.2],
        modeSequence: [13, 7, 14, 11]
    },
    {
        label: "Amble", 
        name: "amble",
        eventTimes: [0.0, 0.15, 0.4, 0.55, 0.8],
        modeSequence: [6, 10, 9, 5]
    },
    { 
        label: "Lindyhop",
        name: "lindyhop",
        eventTimes: [0.0, 0.35, 0.45, 0.8, 0.9, 1.125, 1.35, 1.7, 1.8, 2.025, 2.25, 2.6, 2.7],
        modeSequence: [9, 15, 6, 15, 10, 5, 10, 15, 5, 10, 5, 15]
    },
    {
        label: "Skipping",
        name: "skipping",
        eventTimes: [0.0, 0.21, 0.3, 0.51, 0.6, 0.81, 0.9, 1.11, 1.2, 1.41, 1.5, 1.71, 1.8, 2.01, 2.1, 2.31, 2.4],
        modeSequence: [9, 0, 9, 0, 9, 0, 9, 0, 6, 0, 6, 0, 6, 0, 6, 0]
    },
    {
        label: "Pawup",
        name: "pawup",
        eventTimes: [0.0, 2.0],
        modeSequence: [7]
    },
];  

// Complete configuration
export type Config = {
    modeScheduleTopic: string;
    standUpService: string;
    layDownService: string;
    resetSimulationService: string;
    comHeightParam: string;
    displacementVelocityParam: string;
    rotationVelocityParam: string;
    modeSchedule: ModeSchedule;
};

// The settingsActionReducer responds to user interaction with the settings tree
export function settingsActionReducer(prevConfig: Config, action: SettingsTreeAction): Config {
    return produce(prevConfig, (draft) => {
        if (action.action === "update") {
            const { path, value } = action.payload;
            _.set(draft, path.slice(1), value);       
        }
    });
}

// Build the complete settings tree
export function buildSettingsTree(config: Config, topics?: readonly Topic[]): SettingsTreeNodes {
    // General fields (applicable to all signal types)
    const topicFields: SettingsTreeFields = {
        modeScheduleTopic: {
            label: "MPC mode schedule",
            input: "select",
            value: config.modeScheduleTopic,
            options: (topics ?? [])
                .filter((topic) => topic.schemaName === "ocs2_msgs/mode_schedule")
                .map((topic) => ({
                    label: topic.name,
                    value: topic.name,
                })),
        },        
    };

    const serviceFields: SettingsTreeFields = {
        standUpService: {
            label: "Stand up",
            input: "string",
            value: config.standUpService,
        },
        layDownService: {
            label: "Lay down",
            input: "string",
            value: config.layDownService,
        },
        resetSimulationService: {
            label: "Reset simulation",
            input: "string",
            value: config.resetSimulationService,
        },
    };

    const paramFields: SettingsTreeFields = {
        comHeightParam: {
            label: "COM height",
            input: "string",
            value: config.comHeightParam,
        },
        displacementVelocityParam: {
            label: "Target displacement velocity",
            input: "string",
            value: config.displacementVelocityParam,
        },
        rotationVelocityParam: {
            label: "Target rotation velocity",
            input: "string",
            value: config.rotationVelocityParam,
        },
    };

    // Nodes to build the settings tree that populates foxglove's panel settings
    const settings: SettingsTreeNodes = {
        topics: {
            label: "Topics",
            fields: topicFields,
        },
        services: {
            label: "Services",
            fields: serviceFields,
        },
        parameters: {
            label: "Parameters",
            fields: paramFields,
        },
    };

    return settings;
}