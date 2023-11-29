/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export class ErrorWithStatus extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}
