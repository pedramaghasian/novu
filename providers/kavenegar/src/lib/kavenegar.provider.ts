import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { KavenegarApi, kavenegar } from 'kavenegar';
import { promisify } from 'util';

export class KavenegarSmsProvider implements ISmsProvider {
  id = 'kavenegar';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  api: kavenegar.KavenegarInstance;

  constructor(private config: { apiKey: string }) {
    this.api = KavenegarApi({
      apikey: this.config.apiKey,
    });
  }

  async sendMessage(options: ISmsOptions): Promise<ISendMessageSuccessResponse> {
    const { content, from, to } = options;
    const sendAsync = promisify(this.api.Send.bind(this.api));
    try {
      const response = await sendAsync({ message: content, sender: from, receptor: to });
      return response
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
