import { env } from "../../../src/config/env";

export const buzzData = {

    routes: {
        viewBuzz: '/web/index.php/buzz/viewBuzz',
    },

    apiPaths: {
        feed: '/web/index.php/api/v2/buzz/posts',
        getFeed: '/web/index.php/api/v2/buzz/feed',
    },
    fullUrl: {
        get viewBuzz() {
            return `${env.baseURL}${buzzData.routes.viewBuzz}`;
        }
    },
    fillNewsFeedWithText : {
        text : "This is the first post."
    },
    fillNewsFeedWithXss : {
        text : "<script>alert('XSS')</script>"
    }
}