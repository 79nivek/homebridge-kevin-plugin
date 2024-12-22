import { API } from 'homebridge';

import { AcAccessory } from './lib/HeaterCoolerAccessory';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  // api.registerPlatform(PLATFORM_NAME, KevinHomebridgePlatform);
  api.registerAccessory('homebridge-plugin-kevin', 'ac', AcAccessory);
};
