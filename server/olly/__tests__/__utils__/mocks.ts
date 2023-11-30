/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseLanguageModel } from 'langchain/base_language';

export const MOCKED_MODEL = (jest.fn() as unknown) as BaseLanguageModel;
