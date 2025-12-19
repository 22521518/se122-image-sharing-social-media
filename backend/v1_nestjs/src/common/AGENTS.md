---
module: common
type: shared
rules:
  - "NEVER import from other domain modules (auth, memories, etc.)"
  - "Common is a leaf node in the dependency graph"
  - "Changes here affect the entire system - test thoroughly"
---
