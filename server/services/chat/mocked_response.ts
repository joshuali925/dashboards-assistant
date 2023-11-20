/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMessage, IOutput } from '../../../common/types/chat_saved_object_attributes';
import MOCKED_RESPONSES from './mocked.json';

interface MockResponse {
  question: string;
  output: Array<{
    content: string;
    contentType: 'markdown' | 'ppl_visualization';
    suggestions?: string[];
    toolsUsed?: string[];
  }>;
}

const mockResponses = MOCKED_RESPONSES as MockResponse[];

let lastIndex = 0;
const rand = (min: number, max: number) => Math.random() * (max - min + 1) + min;

export const getMockedResponse = async (question: string): Promise<IMessage[]> => {
  const index = mockResponses.findIndex((resp) => resp.question.trim() === question.trim());
  if (index !== -1) lastIndex = index;
  const outputs = mockResponses[lastIndex++ % mockResponses.length].output;
  await new Promise((resolve) => setTimeout(resolve, rand(10, 20) * 1000));

  return outputs.map((output) => ({
    type: 'output',
    content: output.content,
    traceId: undefined,
    toolsUsed: output.toolsUsed,
    contentType: output.contentType as IOutput['contentType'],
    suggestedActions: output.suggestions?.map((suggestion) => ({
      actionType: 'send_as_input',
      message: suggestion,
    })),
  }));
};
