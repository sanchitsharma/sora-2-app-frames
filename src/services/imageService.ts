import axios from 'axios';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../types';

const API_BASE = '/api';

export const imageService = {
  async generateImages(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const response = await axios.post(`${API_BASE}/proxy-create-image`, request);
    return response.data;
  },
};
