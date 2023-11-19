import {
  Service,
  CharacteristicValue,
  AccessoryConfig,
  Logging,
  API,
  AccessoryPlugin,
} from "homebridge";

export class FanAccessory implements AccessoryPlugin {
  private fanServ: Service;

  private fanStage = {
    On: false,
    speed: 100,
  };

  constructor(
    private readonly log: Logging,
    private readonly config: AccessoryConfig,
    private readonly api: API
  ) {
    // create a new Fan accessory
    const accessory = new api.platformAccessory(
      config.name,
      api.hap.uuid.generate(config.name)
    );

    this.log.info("config", config);

    // create the fan service
    this.fanServ = accessory.addService(api.hap.Service.Fanv2, "fan");

    // create handlers for required characteristics
    this.fanServ
      .getCharacteristic(api.hap.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.fanServ
      .getCharacteristic(api.hap.Characteristic.RotationSpeed)
      .onGet(this.handleRotationSpeedGet.bind(this))
      .onSet(this.handleRotationSpeedSet.bind(this));

    this.fanServ
      .getCharacteristic(api.hap.Characteristic.RotationDirection)
      .onGet(this.handleRotationDirectionGet.bind(this))
      .onSet(this.handleRotationDirectionSet.bind(this));
  }

  getServices(): Service[] {
    return [this.fanServ];
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  handleOnGet(): CharacteristicValue {
    this.log.debug("GET On");

    // set this to a valid value for On
    const currentValue = this.fanStage.On;

    return currentValue;
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value: CharacteristicValue) {
    this.log.debug("SET On:", value);

    this.fanStage.On = value as boolean;

    this.log.info("Set On ->", this.fanStage.On);

    // update the current value
    this.fanServ.updateCharacteristic(
      this.api.hap.Characteristic.On,
      this.fanStage.On
    );
  }

  /**
   * Handle requests to get the current value of the "Rotation Speed" characteristic
   */
  handleRotationSpeedGet(): CharacteristicValue {
    this.log.debug("GET Rotation Speed");

    // set this to a valid value for Rotation Speed
    const currentValue = this.fanStage.speed;

    return currentValue;
  }

  /**
   * Handle requests to set the "Rotation Speed" characteristic
   */
  handleRotationSpeedSet(value: CharacteristicValue) {
    this.log.debug("SET Rotation Speed:", value);

    this.fanStage.speed = value as number;

    // update the current value
    this.fanServ.updateCharacteristic(
      this.api.hap.Characteristic.RotationSpeed,
      this.fanStage.speed
    );
  }

  /**
   * Handle requests to get the current value of the "Rotation Direction" characteristic
   */
  handleRotationDirectionGet(): CharacteristicValue {
    this.log.debug("GET Rotation Direction");

    // set this to a valid value for Rotation Direction
    const currentValue = 0;

    return currentValue;
  }

  /**
   * Handle requests to set the "Rotation Direction" characteristic
   */
  handleRotationDirectionSet(value: CharacteristicValue) {
    this.log.debug("SET Rotation Direction:", value);

    // set this to a valid value for Rotation Direction
    const currentValue = 0;

    // update the current value
    this.fanServ.updateCharacteristic(
      this.api.hap.Characteristic.RotationDirection,
      currentValue
    );
  }
}
