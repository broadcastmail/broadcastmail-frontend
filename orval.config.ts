import {defineConfig} from 'orval';

export default defineConfig({
  broadcastmail: {
    input: './openapi.json',
    output: {
      mode: 'tags-split',
      target: './lib/api/generated',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './lib/api/client/client.ts',
          name: 'orvalClient',
        },
        operations: {
          // POST body is the filters array; treat as a query so it gets useQuery + caching
          listAudience: {
            query: {
              useQuery: true,
            },
          },
          // Renamed from "callback" to avoid collision with React's useCallback.
          // Fix on backend: @Operation(operationId = "oauthCallback") on OAuthSupabaseController#callback
          oauthCallback: {},
        },
      },
    },
  },
});
