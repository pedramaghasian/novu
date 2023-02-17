import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';

import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { encryptCredentials } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';

import { UpdateIntegrationCommand } from './update-integration.command';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { InvalidateCacheService } from '../../../shared/services/cache';
import { KeyGenerator } from '../../../shared/services/cache/keys';

@Injectable()
export class UpdateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations
  ) {}

  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    const existingIntegration = await this.integrationRepository.findById(command.integrationId);
    if (!existingIntegration) throw new NotFoundException(`Entity with id ${command.integrationId} not found`);

    await this.invalidateCache.invalidateByKey({
      key: KeyGenerator.entity().integration({
        _id: command.integrationId,
        _environmentId: command.environmentId,
      }),
    });

    if (command.check) {
      await this.checkIntegration.execute(
        CheckIntegrationCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          credentials: command.credentials,
          providerId: existingIntegration.providerId,
          channel: existingIntegration.channel,
        })
      );
    }

    const updatePayload: Partial<IntegrationEntity> = {};

    if (command.active || command.active === false) {
      updatePayload.active = command.active;
    }

    if (command.credentials) {
      updatePayload.credentials = encryptCredentials(command.credentials);
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.integrationRepository.update(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
      },
      {
        $set: updatePayload,
      }
    );

    if (command.active && ![ChannelTypeEnum.CHAT, ChannelTypeEnum.PUSH].includes(existingIntegration.channel)) {
      await this.deactivateSimilarChannelIntegrations.execute({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        integrationId: command.integrationId,
        channel: existingIntegration.channel,
      });
    }

    return await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: command.environmentId,
    });
  }
}
