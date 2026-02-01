---
trigger: always_on
---

Package Installation Rules:
1. Only install packages from the approved list below.
2. If a package is not on the list, ask before installing.
3. Do not install alternatives or “better” libraries.
4. Use exact versions when specified.
5. Prefer official packages over community forks.

#STARTLIST#
next

react

react-dom

typescript

@mui/material

@mui/icons-material

@mui/x-data-grid

@tanstack/react-query

axios

Backend / DB

prisma

@prisma/client

date-fns

zod

openai
#ENDLIST#

You may:
- Run npm install for approved packages
- Modify package.json dependencies
- Create config files (tsconfig, prisma)

You may not:
- Install packages not on the approved list
- Remove existing dependencies
- Upgrade major versions without approval