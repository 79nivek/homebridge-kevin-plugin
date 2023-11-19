import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  AccessoryConfig,
  Service,
  Characteristic,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { FanAccessory } from "./FanAccessory";

export class KevinHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.debug("Finished initializing platform:", this.config.name);

    log.debug("accessoryConfig:", this.config);

    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices = () => {
    const device = {
      exampleUniqueId: "uniqueId",
      exampleDisplayName: "displayName",
    };

    const uuid = this.api.hap.uuid.generate(device.exampleUniqueId);

    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid
    );

    if (existingAccessory) {
      this.log.info(
        "Restoring existing accessory from cache:",
        existingAccessory.displayName
      );

      // new FanAccessory(this, existingAccessory);
    } else {
      this.log.info("Adding new accessory:", device.exampleDisplayName);

      const accessory = new this.api.platformAccessory(
        device.exampleDisplayName,
        uuid
      );

      accessory.context.device = device;

      // new FanAccessory(this, accessory);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        accessory,
      ]);
    }
  };
}
