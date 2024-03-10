import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { KavenegarSmsProvider } from '@novu/kavenegar';
import { BaseSmsHandler } from './base.handler';

export class KavenegarSmsHandler extends BaseSmsHandler {
  constructor() {
    super('kavenegar', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: { apiKey: string } = { apiKey: credentials.apiKey };

    this.provider = new KavenegarSmsProvider(config);
  }
}
