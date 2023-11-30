/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LLMChain } from 'langchain/chains';
import { MOCKED_MODEL } from '../../__tests__/__utils__/mocks';
import { requestPPLGeneratorChain } from '../ppl_generator';

const callChain = jest.spyOn(LLMChain.prototype, 'call').mockImplementation((values, configs) => {
  return Promise.resolve({ text: '<ppl>\nsource = index |\nhead\n</ppl>' });
});

describe('ppl generator valid query', () => {
  it('should return PPL', async () => {
    const response = await requestPPLGeneratorChain(MOCKED_MODEL, 'return documents from index');
    expect(response.query).toEqual('source = index | head');
    expect(callChain).toBeCalledWith({ question: 'return documents from index' }, undefined);
  });

  it('should return first PPL regardless of extra information', async () => {
    callChain.mockImplementationOnce((values, configs) => {
      return Promise.resolve({
        text:
          'answers and contexts\n<ppl>\nsource = index |\nhead\n</ppl>\nsecond query\n<ppl>\nsource = index |\nhead 10\n</ppl>\nsummary',
      });
    });
    const response = await requestPPLGeneratorChain(MOCKED_MODEL, 'return documents from index');
    expect(response.query).toEqual('source = index | head');
    expect(callChain).toBeCalledWith({ question: 'return documents from index' }, undefined);
  });

  it('should convert ISNOTNULL to lowercase', async () => {
    callChain.mockImplementationOnce((values, configs) => {
      return Promise.resolve({ text: '<ppl>\nsource = index |\nwhere isnotnull(id)\n</ppl>' });
    });
    const response = await requestPPLGeneratorChain(
      MOCKED_MODEL,
      'return documents from index where id is not null'
    );
    expect(response.query).toEqual('source = index | where isnotnull(id)');
    expect(callChain).toBeCalledWith(
      { question: 'return documents from index where id is not null' },
      undefined
    );
  });

  it('should pass callbacks', async () => {
    const callbacks = jest.fn();
    const response = await requestPPLGeneratorChain(
      MOCKED_MODEL,
      'return documents from index'
      callbacks
    );
    expect(response.query).toEqual('source = index | head');
    expect(callChain).toBeCalledWith(
      { question: 'return documents from index' },
      callbacks
    );
    expect(callbacks).toBeCalled();
  });
});
