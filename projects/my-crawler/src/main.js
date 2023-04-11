// // // // For more information, see https://crawlee.dev/
// // // import { PlaywrightCrawler, Dataset } from 'crawlee';

// // // // PlaywrightCrawler crawls the web using a headless
// // // // browser controlled by the Playwright library.
// // // const crawler = new PlaywrightCrawler({
// // //     // Use the requestHandler to process each of the crawled pages.
// // //     async requestHandler({ request, page, enqueueLinks, log }) {
// // //         const title = await page.title();
// // //         log.info(`Title of ${request.loadedUrl} is '${title}'`);

// // //         // Save results as JSON to ./storage/datasets/default
// // //         await Dataset.pushData({ title, url: request.loadedUrl });

// // //         // Extract links from the current page
// // //         // and add them to the crawling queue.
// // //         await enqueueLinks();
// // //     },
// // //     // Uncomment this option to see the browser window.
// // //     // headless: false,
// // // });

// // // // Add first URL to the queue and start the crawl.
// // // await crawler.run(['https://crawlee.dev']);


// // // import { RequestQueue } from 'crawlee';

// // // // First you create the request queue instance.
// // // const requestQueue = await RequestQueue.open();
// // // // And then you add one or more requests to it.
// // // await requestQueue.addRequest({ url: 'https://crawlee.dev' });

// // // Add import of CheerioCrawler
// // import { RequestQueue, CheerioCrawler, enqueueLinks } from 'crawlee';

// // const requestQueue = await RequestQueue.open();
// // await requestQueue.addRequest({ url: 'https://crawlee.dev' });

// // // Create the crawler and add the queue with our URL
// // // and a request handler to process the page.
// // const crawler = new CheerioCrawler({
// //     requestQueue,
// //     // The `$` argument is the Cheerio object
// //     // which contains parsed HTML of the website.
// //     async requestHandler({ $, request, enqueueLinks }) {
// //         // Extract <title> text with Cheerio.
// //         // See Cheerio documentation for API docs.
// //         const title = $('title').text();
// //         console.log(`The title of "${request.url}" is: ${title}.`);
// //         await enqueueLinks({
// //           strategy: 'same-domain'
// //         });
// //     }
// // })

// // // Start the crawler and wait for it to finish
// // await crawler.run();

// // Instead of CheerioCrawler let's use Playwright
// // to be able to render JavaScript.
// import { PlaywrightCrawler } from 'crawlee';

// const crawler = new PlaywrightCrawler({
//     requestHandler: async ({ page, request, enqueueLinks }) => {
//         console.log(`Processing: ${request.url}`)
//         if (request.label === 'DETAIL') {
//             const urlParts = request.url.split('/').slice(-2);
//             const modifiedTimestamp = await page.locator('time[datetime]').getAttribute('datetime');
//             const runsRow = page.locator('ul.ActorHeader-stats > li').filter({ hasText: 'Runs' });
//             const runCountString = await runsRow.locator('span').last().textContent();

//             const results = {
//                 url: request.url,
//                 uniqueIdentifier: urlParts.join('/'),
//                 owner: urlParts[0],
//                 title: await page.locator('h1').textContent(),
//                 description: await page.locator('span.actor-description').textContent(),
//                 modifiedDate: new Date(Number(modifiedTimestamp)),
//                 runCount: Number(runCountString.replaceAll(',', '')),
//             }

//             console.log(results)
//         } else {
//             await page.waitForSelector('.ActorStorePagination-pages a');
//             await enqueueLinks({
//                 selector: '.ActorStorePagination-pages > a',
//                 label: 'LIST',
//             })
//             await page.waitForSelector('.ActorStoreItem');
//             await enqueueLinks({
//                 selector: '.ActorStoreItem',
//                 label: 'DETAIL', // <= note the different label
//             })
//         }
//     }
// });

// await crawler.run(['https://apify.com/store']);


import { Dataset, CheerioCrawler, log, LogLevel } from 'crawlee';

// Crawlers come with various utilities, e.g. for logging.
// Here we use debug level of logging to improve the debugging experience.
// This functionality is optional!
log.setLevel(LogLevel.DEBUG);

// Create an instance of the CheerioCrawler class - a crawler
// that automatically loads the URLs and parses their HTML using the cheerio library.
const crawler = new CheerioCrawler({
    // The crawler downloads and processes the web pages in parallel, with a concurrency
    // automatically managed based on the available system memory and CPU (see AutoscaledPool class).
    // Here we define some hard limits for the concurrency.
    minConcurrency: 10,
    maxConcurrency: 50,

    // On error, retry each page at most once.
    maxRequestRetries: 1,

    // Increase the timeout for processing of each page.
    requestHandlerTimeoutSecs: 30,

    // Limit to 10 requests per one crawl
    maxRequestsPerCrawl: 10,

    // This function will be called for each URL to crawl.
    // It accepts a single parameter, which is an object with options as:
    // https://crawlee.dev/api/cheerio-crawler/interface/CheerioCrawlerOptions#requestHandler
    // We use for demonstration only 2 of them:
    // - request: an instance of the Request class with information such as the URL that is being crawled and HTTP method
    // - $: the cheerio object containing parsed HTML
    async requestHandler({ request, $ }) {
        log.debug(`Processing ${request.url}...`);

        // Extract data from the page using cheerio.
        const title = $('title').text();
        const h1texts: { text: string }[] = [];
        $('h1').each((index, el) => {
            h1texts.push({
                text: $(el).text(),
            });
        });

        // Store the results to the dataset. In local configuration,
        // the data will be stored as JSON files in ./storage/datasets/default
        await Dataset.pushData({
            url: request.url,
            title,
            h1texts,
        });
    },

    // This function is called if the page processing failed more than maxRequestRetries + 1 times.
    failedRequestHandler({ request }) {
        log.debug(`Request ${request.url} failed twice.`);
    },
});

// Run the crawler and wait for it to finish.
await crawler.run([
    'https://crawlee.dev',
]);

log.debug('Crawler finished.');