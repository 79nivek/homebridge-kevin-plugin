import { API } from "homebridge";

import { FanAccessory } from "./lib/FanAccessory";
import { AcAccessory } from "./lib/HeaterCoolerAccessory";

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  // api.registerPlatform(PLATFORM_NAME, KevinHomebridgePlatform);
  api.registerAccessory("homebridge-plugin-kevin", "fan", FanAccessory);
  api.registerAccessory("homebridge-plugin-kevin", "ac", AcAccessory);
};
