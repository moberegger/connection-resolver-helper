# connection-resolver-helper

TODO:
- Configure whether to only use forward or backwards pagination (although this can just be limited in the schema...)
- Configure to disable generating totalCount and nodes?

Things to test:
- With no pagination arguments, all results are returned
- Auto pagination: 
  - With pagination arguments, limited results are returned
- Manual pagination
  - With pagination arguments, limited results are returned

Features
- Introduce new pagination param error, with specific error code(s)
- Configure validate cursor, with default of cursorToOffset