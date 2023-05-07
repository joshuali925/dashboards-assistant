/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyoutBody,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiText,
} from '@elastic/eui';
import { produce } from 'immer';
import React, { useContext, useMemo, useState } from 'react';
import { SavedObjectsFindOptions, SimpleSavedObject } from '../../../../../../../src/core/public';
import { IChat } from '../../../../../common/types/observability_saved_object_attributes';
import { ChatContext, ConversationContext } from '../../header_chat_button';
import { useBulkGetChat } from '../../hooks/use_get_chat';

export const ChatHistoryPage: React.FC = () => {
  console.count('ChatHistoryPage rerender');
  const chatContext = useContext(ChatContext)!;
  const conversationContext = useContext(ConversationContext)!;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const bulkGetOptions: Partial<SavedObjectsFindOptions> = useMemo(
    () => ({
      page: pageIndex + 1,
      perPage: pageSize,
      sortOrder: 'desc',
      sortField: 'updated_at',
    }),
    [pageIndex, pageSize]
  );
  const { data: chats, loading, error } = useBulkGetChat(bulkGetOptions);

  const onTableChange = (criteria: CriteriaWithPagination<SimpleSavedObject<IChat>>) => {
    const { index, size } = criteria.page;
    setPageIndex(index);
    setPageSize(size);
  };

  const columns: Array<EuiBasicTableColumn<SimpleSavedObject<IChat>>> = [
    {
      field: 'id',
      name: 'Chat',
      render: (id: string, item) => (
        <EuiLink
          onClick={() => {
            conversationContext.setLocalConversation(
              produce((draft) => {
                draft.conversations = [];
              })
            );
            chatContext.setChatId(id);
            chatContext.setSelectedTabId('chat');
          }}
        >
          {item.attributes.title}
        </EuiLink>
      ),
    },
    {
      field: 'updated_at',
      name: 'Updated Time',
      render: (updatedAt: string) => <EuiText size="s">{updatedAt}</EuiText>,
    },
  ];

  return (
    <EuiFlyoutBody>
      <EuiPage>
        <EuiPageBody component="div">
          <EuiBasicTable
            items={chats?.savedObjects || []}
            rowHeader="firstName"
            loading={loading}
            error={error?.message}
            columns={columns}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: chats?.total || 0,
            }}
            onChange={onTableChange}
          />
        </EuiPageBody>
      </EuiPage>
    </EuiFlyoutBody>
  );
};
