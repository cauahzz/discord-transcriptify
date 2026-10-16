import { TranscriptImageDownloader } from '../downloader/images';
import type { FeatureDescriptor } from './types';

export const imagesFeature: FeatureDescriptor = {
  key: 'images',

  callbacks: ({ images }) => ({
    resolveImageSrc: new TranscriptImageDownloader()
      .withMaxDimensions(images.maxWidth, images.maxHeight)
      .withCompression(images.quality, images.webp)
      .withSharpCache(images.sharpCache)
      .withMaxSize(images.maxSizeKb)
      .withMaxTotalSize(images.maxTotalSizeKb)
      .withConcurrency(images.concurrency)
      .build(),
  }),
};
