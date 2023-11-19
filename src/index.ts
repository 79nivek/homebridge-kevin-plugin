import { API } from "homebridge";

import { FanAccessory } from "./FanAccessory";
import { AcAccessory } from "./HeaterCoolerAccessory";

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  // api.registerPlatform(PLATFORM_NAME, KevinHomebridgePlatform);
  api.registerAccessory("homebridge-plugin-kevin", "fan", FanAccessory);
  api.registerAccessory("homebridge-plugin-kevin", "ac", AcAccessory);
};
