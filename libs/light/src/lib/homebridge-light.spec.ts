import { homebridgeLight } from './homebridge-light';

describe('homebridgeLight', () => {
  it('should work', () => {
    expect(homebridgeLight()).toEqual('homebridge-light');
  });
});
