# Run summary: httpbin_DEMO

- Test cases (requests): 8 | passed: 3 | failed: 5 | success: 38%
- Assertions: 10 | failed: 5
- Duration: 2.1 s

## By folder

| Folder | Passed | Failed |
|---|---|---|
| 001.bearer | 2 | 0 |
| 002.post | 1 | 5 |

## Most frequent failure reasons

- 5 × expected status 400, got 200

## Failed cases

- **TC.002.001.400a Error without.name** (POST, responded 200)
  - Status code is 400: expected status 400, got 200
- **TC.002.001.400b Error without.age** (POST, responded 200)
  - Status code is 400: expected status 400, got 200
- **TC.002.001.400c Error with.name.wrong** (POST, responded 200)
  - Status code is 400: expected status 400, got 200
- **TC.002.001.400d Error with.age.wrong** (POST, responded 200)
  - Status code is 400: expected status 400, got 200
- **TC.002.001.400e Error with.vaccinated.wrong** (POST, responded 200)
  - Status code is 400: expected status 400, got 200
