import { Immutable, PanelExtensionContext, SettingsTreeAction, Topic } from "@foxglove/extension";
import { Autocomplete, Button } from "@mui/material";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import _ from "lodash-es"

import { Config, buildSettingsTree, settingsActionReducer, ModeSchedule, DEFAULT_MODE_SCHEDULE } from "./settings";

function LeggedRobotPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // Set default values for all config fields
  const [config, setConfig] = useState<Config>(() => {
    const partialConfig = context.initialState as Partial<Config>;
    partialConfig.modeScheduleTopic ??= "/legged_robot_mpc_mode_schedule";
    partialConfig.standUpService ??= "/legged_controller/stand_up";
    partialConfig.layDownService ??= "/legged_controller/lay_down";
    partialConfig.resetSimulationService ??= "/legged_robot/reset_simulation";
    partialConfig.comHeightParam ??= "/legged_controller/com_height";
    partialConfig.displacementVelocityParam ??= "/legged_controller/target_displacement_velocity";
    partialConfig.rotationVelocityParam ??= "/legged_controller/target_rotation_velocity";
    partialConfig.modeSchedule ??= {
      label: "Stance",
      name: "stance",
      eventTimes: [0.0, 0.5],
      modeSequence: [15],
    };
    return partialConfig as Config;
  });

  const settingsActionHandler = useCallback(
    (action:SettingsTreeAction) => {
      setConfig((prevConfig) => settingsActionReducer(prevConfig, action));
    },
    [setConfig],
  );

  // Resgister the settings tree
  useEffect(() => {
    context.updatePanelSettingsEditor({
      actionHandler: settingsActionHandler,
      nodes: buildSettingsTree(config, topics),
    });
  }, [config, context, settingsActionHandler, topics]);

  // We use a layout effect to setup render handling for our panel. We also setup some topic subscriptions.
  useLayoutEffect(() => {
    // The render handler is run by the broader studio system during playback when your panel
    // needs to render because the fields it is watching have changed. How you handle rendering depends on your framework.
    // You can only setup one render handler - usually early on in setting up your panel.
    //
    // Without a render handler your panel will never receive updates.
    //
    // The render handler could be invoked as often as 60hz during playback if fields are changing often.
    context.onRender = (renderState, done) => {
      // render functions receive a _done_ callback. You MUST call this callback to indicate your panel has finished rendering.
      // Your panel will not receive another render callback until _done_ is called from a prior render. If your panel is not done
      // rendering before the next render call, studio shows a notification to the user that your panel is delayed.
      //
      // Set the done callback into a state variable to trigger a re-render.
      setRenderDone(() => done);

      // We may have new topics - since we are also watching for messages in the current frame, topics may not have changed
      // It is up to you to determine the correct action when state has not changed.
      setTopics(renderState.topics);
    };

    // After adding a render handler, you must indicate which fields from RenderState will trigger updates.
    // If you do not watch any fields then your panel will never render since the panel context will assume you do not want any updates.

    // Tell the panel context that we care about any update to the _topic_ field of RenderState
    context.watch("topics");

    // Tell the panel context we want messages for the current frame for topics we've subscribed to
    // This corresponds to the _currentFrame_ field of render state.
    context.watch("currentFrame");
  }, [context]);

  // Invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // Save config and update default panel title
  useEffect(() => {
    context.saveState(config);
    context.setDefaultPanelTitle(`Legged Robot`);
  }, [config, context]);

  // Callback for "MPC Mode" autocomplete (publishes to corresponding topic)
  const onModeChange = useCallback((_event: any, newValue: ModeSchedule | null) => {
    if(newValue) {
      context.advertise?.(config.modeScheduleTopic, "ocs2_msgs/mode_schedule");
      context.publish?.(config.modeScheduleTopic, {"eventTimes": newValue.eventTimes, "modeSequence": newValue.modeSequence});
    }
  }, [config, context]);

  // Callback for "COM height" text field (sets corresponding parameter)
  const setComHeight = useCallback((event: any) => {
    context.setParameter?.(config.comHeightParam, Number(event.target.value));
  }, [config, context]);

  // Callback for "Target displacement velocity" text field (sets corresponding parameter)
  const setTargetDisplacementVelocity = useCallback((event: any) => {
    context.setParameter?.(config.displacementVelocityParam, Number(event.target.value));
  }, [config, context]);

  // Callback for "Target rotation velocity" text field (sets corresponding parameter)
  const setTargetRotationVelocity = useCallback((event: any) => {
    context.setParameter?.(config.rotationVelocityParam, Number(event.target.value));
  }, [config, context]);

  // Callback for "Stand up" button (calls the corresponding service)
  const standUp = useCallback(async () => {
    await context.callService?.(
      config.standUpService,
      {},
    );
  }, [config, context]);

  // Callback for "Lay down" button (calls the corresponding service)
  const layDown = useCallback(async () => {
    await context.callService?.(
      config.layDownService,
      {},
    );
  }, [config, context]);

  // Callback for the "Reset simulation" button (calls the corresponding service)
  const resetSimulation = useCallback(async () => {
    await context.callService?.(
      config.resetSimulationService,
      {},
    );
  }, [context]);

  // Render the panel
  return (
    <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column"}}>
      <Autocomplete
        disablePortal
        id="modeSequence"
        options={DEFAULT_MODE_SCHEDULE}
        onChange={onModeChange}
        sx={{ width: 250, marginBottom: "1rem" }}
        renderInput={(params: any) => <TextField {...params} label="MPC Mode" variant="filled" style={{ backgroundColor: "whitesmoke" }} />}
        ListboxProps={{style: {maxHeight: "200px"}}}
      />
      <TextField
        label="COM Height"
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ step: 0.01, min: 0.00, max: 2.00 }}
        InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment>}}
        onChange={setComHeight}
        variant="filled"
        defaultValue={0.3}
        sx={{ width: 250, marginBottom: "1rem" }}
        style={{ backgroundColor: "whitesmoke" }}
      />
      <TextField
        label="Target displacement velocity"
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ step: 0.1, min: 0.0 }}
        InputProps={{ endAdornment: <InputAdornment position="end">m/s</InputAdornment>}}
        onChange={setTargetDisplacementVelocity}
        variant="filled"
        defaultValue={0.2}
        sx={{ width: 250, marginBottom: "1rem" }}
        style={{ backgroundColor: "whitesmoke" }}
      />
      <TextField
        label="Target rotation velocity"
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ step: 0.1, min: 0.0 }}
        InputProps={{ endAdornment: <InputAdornment position="end">rad/s</InputAdornment>}}
        onChange={setTargetRotationVelocity}
        variant="filled"
        defaultValue={1.0}
        sx={{ width: 250, marginBottom: "1rem" }}
        style={{ backgroundColor: "whitesmoke" }}
      />
      <div style={{ paddingBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", width: 250 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={standUp}
          sx={{ width: '100%' }}
        >Stand up</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={layDown}
          sx={{ width: '100%' }}
        >Lay down</Button>
      </div>
      <div style={{ paddingBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", width: 250 }}>
        <Button
          variant="contained"
          color="error"
          onClick={resetSimulation}
          sx={{ width: '100%' }}
        >Reset simulation</Button>
      </div>
    </div>
  );
}

export function initLeggedRobotPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<LeggedRobotPanel context={context} />, context.panelElement);

  // Return a function to run when the panel is removed
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
