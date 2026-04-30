import { runMazra3tyScrape } from '../src/jobs/scrape-mazra3ty';

runMazra3tyScrape()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
