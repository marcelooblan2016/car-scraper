const axios = require('axios');
const bluebird = require("bluebird");
const _ = require('lodash');

class Enterprise {

    constructor(options) {
        this.fs = options.fs;
        this.feedName = options.feedName;
        this.C = options.C;
        this.DBConfig = options.DBConfig;
        this.log = options.log;
        this.helper = options.helper;

        this.totalVehicles = 0;
        this.scrapedVehicles = 0;

    }

    async enterpriseApiRequest(apiUrl, apiParameters) {
        let responseData = null;
        try {
            await axios.post(
                apiUrl,
                apiParameters,
                {
                    headers: { 
                        'Content-Type' : 'text/plain' 
                    }
                }
            )
            .then(response => {
                responseData = response.data;
            })
            .catch(error => {
                return [];
            });
            
            return responseData;

        } catch (error) {
            
            return [];
        }
    }

    apiParameters(page, year) {

        let sizePerPage = this.DBConfig.ENTERPRISE_PARAMS_PAGE_SIZE;
        let parameters = [];
        if (year != null) {
            parameters = [
                'q=((vehicle_filter_ids%3A1)%20AND%20((year_sidebar%3A%5B' + year +' TO ' + year + '%5D)))&',
                'expr.drivetime=(account_id%3D%3D188%3F5%3A(account_id%3D%3D200%3F4%3A(account_id%3D%3D190%3F3%3A(account_id%3D%3D198%3F2%3A0))))&',
                'expr.distance=haversin(40.7686973%2C-73.9918181%2Clocation_latlon.latitude%2Clocation_latlon.longitude)%20*%200.621371&',
                'expr.distance_sort=(account_id%3D%3D188%3F99999%3A(account_id%3D%3D200%3F99999%3A(account_id%3D%3D190%3F99999%3A(account_id%3D%3D198%3F99999%3Ahaversin(40.7686973%2C-73.9918181%2Clocation_latlon.latitude%2Clocation_latlon.longitude)%20*%200.621371))))&',
                'expr.total_price=((account_id%3D%3D121%7C%7Caccount_id%3D%3D182%7C%7Caccount_id%3D%3D186%7C%7Caccount_id%3D%3D188%7C%7Caccount_id%3D%3D189%7C%7Caccount_id%3D%3D190%7C%7Caccount_id%3D%3D197%7C%7Caccount_id%3D%3D198%7C%7Caccount_id%3D%3D200%7C%7Caccount_id%3D%3D201)%3F(0%2Bdisplay_price)%3A((account_id%3D%3D122%7C%7Caccount_id%3D%3D123%7C%7Caccount_id%3D%3D184%7C%7Caccount_id%3D%3D219%7C%7Caccount_id%3D%3D220%7C%7Caccount_id%3D%3D221%7C%7Caccount_id%3D%3D228%7C%7Caccount_id%3D%3D229%7C%7Caccount_id%3D%3D230%7C%7Caccount_id%3D%3D279%7C%7Caccount_id%3D%3D280%7C%7Caccount_id%3D%3D296%7C%7Caccount_id%3D%3D307%7C%7Caccount_id%3D%3D316%7C%7Caccount_id%3D%3D346%7C%7Caccount_id%3D%3D347%7C%7Caccount_id%3D%3D348%7C%7Caccount_id%3D%3D383%7C%7Caccount_id%3D%3D398%7C%7Caccount_id%3D%3D401%7C%7Caccount_id%3D%3D405%7C%7Caccount_id%3D%3D419%7C%7Caccount_id%3D%3D420%7C%7Caccount_id%3D%3D421%7C%7Caccount_id%3D%3D422%7C%7Caccount_id%3D%3D428%7C%7Caccount_id%3D%3D429)%3F(305%2Bdisplay_price)%3A((account_id%3D%3D159%7C%7Caccount_id%3D%3D250%7C%7Caccount_id%3D%3D251%7C%7Caccount_id%3D%3D299%7C%7Caccount_id%3D%3D331%7C%7Caccount_id%3D%3D349%7C%7Caccount_id%3D%3D409)%3F(315%2Bdisplay_price)%3A((account_id%3D%3D160%7C%7Caccount_id%3D%3D161%7C%7Caccount_id%3D%3D162%7C%7Caccount_id%3D%3D163%7C%7Caccount_id%3D%3D327)%3F(320%2Bdisplay_price)%3A((account_id%3D%3D426)%3F(323%2Bdisplay_price)%3A((account_id%3D%3D156%7C%7Caccount_id%3D%3D157)%3F(356%2Bdisplay_price)%3A((account_id%3D%3D183)%3F(383%2Bdisplay_price)%3A((account_id%3D%3D335)%3F(389%2Bdisplay_price)%3A((account_id%3D%3D254%7C%7Caccount_id%3D%3D256)%3F(420%2Bdisplay_price)%3A((account_id%3D%3D202%7C%7Caccount_id%3D%3D204%7C%7Caccount_id%3D%3D397%7C%7Caccount_id%3D%3D416)%3F(440%2Bdisplay_price)%3A((account_id%3D%3D427)%3F(462%2Bdisplay_price)%3A((account_id%3D%3D255%7C%7Caccount_id%3D%3D278)%3F(529%2Bdisplay_price)%3A((account_id%3D%3D252)%3F(549%2Bdisplay_price)%3A((account_id%3D%3D203)%3F(553%2Bdisplay_price)%3A((account_id%3D%3D224%7C%7Caccount_id%3D%3D225%7C%7Caccount_id%3D%3D293%7C%7Caccount_id%3D%3D333%7C%7Caccount_id%3D%3D341%7C%7Caccount_id%3D%3D351)%3F(597%2Bdisplay_price)%3A((account_id%3D%3D253%7C%7Caccount_id%3D%3D400)%3F(689%2Bdisplay_price)%3A((account_id%3D%3D208%7C%7Caccount_id%3D%3D209%7C%7Caccount_id%3D%3D324)%3F(739%2Bdisplay_price)%3A((account_id%3D%3D176%7C%7Caccount_id%3D%3D179%7C%7Caccount_id%3D%3D206)%3F(752%2Bdisplay_price)%3A((account_id%3D%3D301%7C%7Caccount_id%3D%3D302)%3F(769%2Bdisplay_price)%3A((account_id%3D%3D177%7C%7Caccount_id%3D%3D338)%3F(772%2Bdisplay_price)%3A((account_id%3D%3D263)%3F(784%2Bdisplay_price)%3A((account_id%3D%3D265)%3F(792%2Bdisplay_price)%3A((account_id%3D%3D402%7C%7Caccount_id%3D%3D403)%3F(852%2Bdisplay_price)%3A((account_id%3D%3D175%7C%7Caccount_id%3D%3D178)%3F(858%2Bdisplay_price)%3A((account_id%3D%3D205%7C%7Caccount_id%3D%3D207%7C%7Caccount_id%3D%3D407)%3F(944%2Bdisplay_price)%3A((account_id%3D%3D382)%3F(965%2Bdisplay_price)%3A((account_id%3D%3D164%7C%7Caccount_id%3D%3D165%7C%7Caccount_id%3D%3D303)%3F(972%2Bdisplay_price)%3A((account_id%3D%3D146%7C%7Caccount_id%3D%3D147)%3F(1019%2Bdisplay_price)%3A((account_id%3D%3D231%7C%7Caccount_id%3D%3D233)%3F(1022%2Bdisplay_price)%3A((account_id%3D%3D137%7C%7Caccount_id%3D%3D138)%3F(1063%2Bdisplay_price)%3A((account_id%3D%3D151%7C%7Caccount_id%3D%3D152)%3F(1072%2Bdisplay_price)%3A((account_id%3D%3D417)%3F(1080%2Bdisplay_price)%3A((account_id%3D%3D232%7C%7Caccount_id%3D%3D234)%3F(1083%2Bdisplay_price)%3A((account_id%3D%3D143)%3F(1160%2Bdisplay_price)%3A((account_id%3D%3D142%7C%7Caccount_id%3D%3D144%7C%7Caccount_id%3D%3D145%7C%7Caccount_id%3D%3D345)%3F(1169%2Bdisplay_price)%3A((account_id%3D%3D141%7C%7Caccount_id%3D%3D168%7C%7Caccount_id%3D%3D169%7C%7Caccount_id%3D%3D170%7C%7Caccount_id%3D%3D171%7C%7Caccount_id%3D%3D172%7C%7Caccount_id%3D%3D173%7C%7Caccount_id%3D%3D308%7C%7Caccount_id%3D%3D309%7C%7Caccount_id%3D%3D354)%3F(1225%2Bdisplay_price)%3A((account_id%3D%3D235%7C%7Caccount_id%3D%3D237)%3F(1231%2Bdisplay_price)%3A((account_id%3D%3D133%7C%7Caccount_id%3D%3D134%7C%7Caccount_id%3D%3D135%7C%7Caccount_id%3D%3D136)%3F(1233%2Bdisplay_price)%3A((account_id%3D%3D262)%3F(1241%2Bdisplay_price)%3A((account_id%3D%3D83%7C%7Caccount_id%3D%3D132%7C%7Caccount_id%3D%3D314%7C%7Caccount_id%3D%3D330)%3F(1258%2Bdisplay_price)%3A((account_id%3D%3D124%7C%7Caccount_id%3D%3D310)%3F(1368%2Bdisplay_price)%3A((account_id%3D%3D155%7C%7Caccount_id%3D%3D325)%3F(1386%2Bdisplay_price)%3A((account_id%3D%3D415)%3F(1392%2Bdisplay_price)%3A((account_id%3D%3D412)%3F(1397%2Bdisplay_price)%3A((account_id%3D%3D84)%3F(1406%2Bdisplay_price)%3A((account_id%3D%3D125%7C%7Caccount_id%3D%3D313)%3F(1432%2Bdisplay_price)%3A((account_id%3D%3D423)%3F(1436%2Bdisplay_price)%3A((account_id%3D%3D181)%3F(1445%2Bdisplay_price)%3A((account_id%3D%3D126%7C%7Caccount_id%3D%3D404)%3F(1448%2Bdisplay_price)%3A((account_id%3D%3D212%7C%7Caccount_id%3D%3D317%7C%7Caccount_id%3D%3D332)%3F(1449%2Bdisplay_price)%3A((account_id%3D%3D236)%3F(1458%2Bdisplay_price)%3A((account_id%3D%3D127)%3F(1469%2Bdisplay_price)%3A((account_id%3D%3D385)%3F(1471%2Bdisplay_price)%3A((account_id%3D%3D241%7C%7Caccount_id%3D%3D243%7C%7Caccount_id%3D%3D411)%3F(1508%2Bdisplay_price)%3A((account_id%3D%3D139%7C%7Caccount_id%3D%3D140%7C%7Caccount_id%3D%3D153%7C%7Caccount_id%3D%3D311)%3F(1512%2Bdisplay_price)%3A((account_id%3D%3D129%7C%7Caccount_id%3D%3D130%7C%7Caccount_id%3D%3D131)%3F(1518%2Bdisplay_price)%3A((account_id%3D%3D148%7C%7Caccount_id%3D%3D149%7C%7Caccount_id%3D%3D174)%3F(1523%2Bdisplay_price)%3A((account_id%3D%3D242)%3F(1529%2Bdisplay_price)%3A((account_id%3D%3D418)%3F(1545%2Bdisplay_price)%3A((account_id%3D%3D326)%3F(1546%2Bdisplay_price)%3A((account_id%3D%3D388)%3F(1549%2Bdisplay_price)%3A((account_id%3D%3D166%7C%7Caccount_id%3D%3D167%7C%7Caccount_id%3D%3D343)%3F(1558%2Bdisplay_price)%3A((account_id%3D%3D329)%3F(1560%2Bdisplay_price)%3A((account_id%3D%3D213)%3F(1566%2Bdisplay_price)%3A((account_id%3D%3D381)%3F(1576%2Bdisplay_price)%3A((account_id%3D%3D154%7C%7Caccount_id%3D%3D312)%3F(1580%2Bdisplay_price)%3A((account_id%3D%3D238%7C%7Caccount_id%3D%3D239%7C%7Caccount_id%3D%3D240)%3F(1581%2Bdisplay_price)%3A((account_id%3D%3D384)%3F(1603%2Bdisplay_price)%3A((account_id%3D%3D128%7C%7Caccount_id%3D%3D410)%3F(1609%2Bdisplay_price)%3A((account_id%3D%3D424)%3F(1677%2Bdisplay_price)%3A((account_id%3D%3D244%7C%7Caccount_id%3D%3D246%7C%7Caccount_id%3D%3D318)%3F(1687%2Bdisplay_price)%3A((account_id%3D%3D247%7C%7Caccount_id%3D%3D320)%3F(1693%2Bdisplay_price)%3A((account_id%3D%3D118%7C%7Caccount_id%3D%3D119%7C%7Caccount_id%3D%3D120%7C%7Caccount_id%3D%3D414)%3F(1739%2Bdisplay_price)%3A((account_id%3D%3D399)%3F(1747%2Bdisplay_price)%3A((account_id%3D%3D192%7C%7Caccount_id%3D%3D193)%3F(1846%2Bdisplay_price)%3A((account_id%3D%3D248%7C%7Caccount_id%3D%3D315)%3F(1874%2Bdisplay_price)%3A((account_id%3D%3D425)%3F(1993%2Bdisplay_price)%3A((account_id%3D%3D195%7C%7Caccount_id%3D%3D196)%3F(2015%2Bdisplay_price)%3A((account_id%3D%3D89)%3F(2033%2Bdisplay_price)%3A((account_id%3D%3D86%7C%7Caccount_id%3D%3D87%7C%7Caccount_id%3D%3D88%7C%7Caccount_id%3D%3D353)%3F(2047%2Bdisplay_price)%3A((account_id%3D%3D355)%3F(2061%2Bdisplay_price)%3A((account_id%3D%3D396)%3F(2066%2Bdisplay_price)%3A((account_id%3D%3D96%7C%7Caccount_id%3D%3D98%7C%7Caccount_id%3D%3D101%7C%7Caccount_id%3D%3D430)%3F(2067%2Bdisplay_price)%3A((account_id%3D%3D257%7C%7Caccount_id%3D%3D258%7C%7Caccount_id%3D%3D260)%3F(2096%2Bdisplay_price)%3A((account_id%3D%3D92)%3F(2102%2Bdisplay_price)%3A((account_id%3D%3D97)%3F(2103%2Bdisplay_price)%3A((account_id%3D%3D259)%3F(2117%2Bdisplay_price)%3A((account_id%3D%3D99)%3F(2123%2Bdisplay_price)%3A((account_id%3D%3D90%7C%7Caccount_id%3D%3D95)%3F(2128%2Bdisplay_price)%3A((account_id%3D%3D217%7C%7Caccount_id%3D%3D218)%3F(2134%2Bdisplay_price)%3A((account_id%3D%3D91)%3F(2146%2Bdisplay_price)%3A((account_id%3D%3D93)%3F(2157%2Bdisplay_price)%3A((account_id%3D%3D104%7C%7Caccount_id%3D%3D111%7C%7Caccount_id%3D%3D114)%3F(2172%2Bdisplay_price)%3A((account_id%3D%3D107%7C%7Caccount_id%3D%3D113%7C%7Caccount_id%3D%3D115%7C%7Caccount_id%3D%3D117%7C%7Caccount_id%3D%3D295)%3F(2178%2Bdisplay_price)%3A((account_id%3D%3D194%7C%7Caccount_id%3D%3D408)%3F(2179%2Bdisplay_price)%3A((account_id%3D%3D103%7C%7Caccount_id%3D%3D106%7C%7Caccount_id%3D%3D112%7C%7Caccount_id%3D%3D297)%3F(2208%2Bdisplay_price)%3A((account_id%3D%3D102%7C%7Caccount_id%3D%3D105%7C%7Caccount_id%3D%3D108%7C%7Caccount_id%3D%3D109%7C%7Caccount_id%3D%3D110%7C%7Caccount_id%3D%3D116%7C%7Caccount_id%3D%3D328)%3F(2214%2Bdisplay_price)%3Adisplay_price)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))&',
                'q.parser=lucene&',
                'size=' + sizePerPage + '&',
                'sort=has_image%20desc%2Cdrivetime%20desc%2Cdistance_sort%20asc%2Chas_price%20desc%2Ctotal_price%20asc%2Cmileage%20asc&',
                'start=' + page
            ].join("");
        }
        else {
            parameters = [
                'q=((vehicle_filter_ids%3A1))&',
                'expr.drivetime=(account_id%3D%3D188%3F5%3A(account_id%3D%3D200%3F4%3A(account_id%3D%3D190%3F3%3A(account_id%3D%3D198%3F2%3A0))))&',
                'expr.distance=haversin(40.7686973%2C-73.9918181%2Clocation_latlon.latitude%2Clocation_latlon.longitude)%20*%200.621371&',
                'expr.distance_sort=(account_id%3D%3D188%3F99999%3A(account_id%3D%3D200%3F99999%3A(account_id%3D%3D190%3F99999%3A(account_id%3D%3D198%3F99999%3Ahaversin(40.7686973%2C-73.9918181%2Clocation_latlon.latitude%2Clocation_latlon.longitude)%20*%200.621371))))&',
                'expr.total_price=((account_id%3D%3D121%7C%7Caccount_id%3D%3D182%7C%7Caccount_id%3D%3D186%7C%7Caccount_id%3D%3D188%7C%7Caccount_id%3D%3D189%7C%7Caccount_id%3D%3D190%7C%7Caccount_id%3D%3D197%7C%7Caccount_id%3D%3D198%7C%7Caccount_id%3D%3D200%7C%7Caccount_id%3D%3D201)%3F(0%2Bdisplay_price)%3A((account_id%3D%3D122%7C%7Caccount_id%3D%3D123%7C%7Caccount_id%3D%3D184%7C%7Caccount_id%3D%3D219%7C%7Caccount_id%3D%3D220%7C%7Caccount_id%3D%3D221%7C%7Caccount_id%3D%3D228%7C%7Caccount_id%3D%3D229%7C%7Caccount_id%3D%3D230%7C%7Caccount_id%3D%3D279%7C%7Caccount_id%3D%3D280%7C%7Caccount_id%3D%3D296%7C%7Caccount_id%3D%3D307%7C%7Caccount_id%3D%3D316%7C%7Caccount_id%3D%3D346%7C%7Caccount_id%3D%3D347%7C%7Caccount_id%3D%3D348%7C%7Caccount_id%3D%3D383%7C%7Caccount_id%3D%3D398%7C%7Caccount_id%3D%3D401%7C%7Caccount_id%3D%3D405%7C%7Caccount_id%3D%3D419%7C%7Caccount_id%3D%3D420%7C%7Caccount_id%3D%3D421%7C%7Caccount_id%3D%3D422%7C%7Caccount_id%3D%3D428%7C%7Caccount_id%3D%3D429)%3F(305%2Bdisplay_price)%3A((account_id%3D%3D159%7C%7Caccount_id%3D%3D250%7C%7Caccount_id%3D%3D251%7C%7Caccount_id%3D%3D299%7C%7Caccount_id%3D%3D331%7C%7Caccount_id%3D%3D349%7C%7Caccount_id%3D%3D409)%3F(315%2Bdisplay_price)%3A((account_id%3D%3D160%7C%7Caccount_id%3D%3D161%7C%7Caccount_id%3D%3D162%7C%7Caccount_id%3D%3D163%7C%7Caccount_id%3D%3D327)%3F(320%2Bdisplay_price)%3A((account_id%3D%3D426)%3F(323%2Bdisplay_price)%3A((account_id%3D%3D156%7C%7Caccount_id%3D%3D157)%3F(356%2Bdisplay_price)%3A((account_id%3D%3D183)%3F(383%2Bdisplay_price)%3A((account_id%3D%3D335)%3F(389%2Bdisplay_price)%3A((account_id%3D%3D254%7C%7Caccount_id%3D%3D256)%3F(420%2Bdisplay_price)%3A((account_id%3D%3D202%7C%7Caccount_id%3D%3D204%7C%7Caccount_id%3D%3D397%7C%7Caccount_id%3D%3D416)%3F(440%2Bdisplay_price)%3A((account_id%3D%3D427)%3F(462%2Bdisplay_price)%3A((account_id%3D%3D255%7C%7Caccount_id%3D%3D278)%3F(529%2Bdisplay_price)%3A((account_id%3D%3D252)%3F(549%2Bdisplay_price)%3A((account_id%3D%3D203)%3F(553%2Bdisplay_price)%3A((account_id%3D%3D224%7C%7Caccount_id%3D%3D225%7C%7Caccount_id%3D%3D293%7C%7Caccount_id%3D%3D333%7C%7Caccount_id%3D%3D341%7C%7Caccount_id%3D%3D351)%3F(597%2Bdisplay_price)%3A((account_id%3D%3D253%7C%7Caccount_id%3D%3D400)%3F(689%2Bdisplay_price)%3A((account_id%3D%3D208%7C%7Caccount_id%3D%3D209%7C%7Caccount_id%3D%3D324)%3F(739%2Bdisplay_price)%3A((account_id%3D%3D176%7C%7Caccount_id%3D%3D179%7C%7Caccount_id%3D%3D206)%3F(752%2Bdisplay_price)%3A((account_id%3D%3D301%7C%7Caccount_id%3D%3D302)%3F(769%2Bdisplay_price)%3A((account_id%3D%3D177%7C%7Caccount_id%3D%3D338)%3F(772%2Bdisplay_price)%3A((account_id%3D%3D263)%3F(784%2Bdisplay_price)%3A((account_id%3D%3D265)%3F(792%2Bdisplay_price)%3A((account_id%3D%3D402%7C%7Caccount_id%3D%3D403)%3F(852%2Bdisplay_price)%3A((account_id%3D%3D175%7C%7Caccount_id%3D%3D178)%3F(858%2Bdisplay_price)%3A((account_id%3D%3D205%7C%7Caccount_id%3D%3D207%7C%7Caccount_id%3D%3D407)%3F(944%2Bdisplay_price)%3A((account_id%3D%3D382)%3F(965%2Bdisplay_price)%3A((account_id%3D%3D164%7C%7Caccount_id%3D%3D165%7C%7Caccount_id%3D%3D303)%3F(972%2Bdisplay_price)%3A((account_id%3D%3D146%7C%7Caccount_id%3D%3D147)%3F(1019%2Bdisplay_price)%3A((account_id%3D%3D231%7C%7Caccount_id%3D%3D233)%3F(1022%2Bdisplay_price)%3A((account_id%3D%3D137%7C%7Caccount_id%3D%3D138)%3F(1063%2Bdisplay_price)%3A((account_id%3D%3D151%7C%7Caccount_id%3D%3D152)%3F(1072%2Bdisplay_price)%3A((account_id%3D%3D417)%3F(1080%2Bdisplay_price)%3A((account_id%3D%3D232%7C%7Caccount_id%3D%3D234)%3F(1083%2Bdisplay_price)%3A((account_id%3D%3D143)%3F(1160%2Bdisplay_price)%3A((account_id%3D%3D142%7C%7Caccount_id%3D%3D144%7C%7Caccount_id%3D%3D145%7C%7Caccount_id%3D%3D345)%3F(1169%2Bdisplay_price)%3A((account_id%3D%3D141%7C%7Caccount_id%3D%3D168%7C%7Caccount_id%3D%3D169%7C%7Caccount_id%3D%3D170%7C%7Caccount_id%3D%3D171%7C%7Caccount_id%3D%3D172%7C%7Caccount_id%3D%3D173%7C%7Caccount_id%3D%3D308%7C%7Caccount_id%3D%3D309%7C%7Caccount_id%3D%3D354)%3F(1225%2Bdisplay_price)%3A((account_id%3D%3D235%7C%7Caccount_id%3D%3D237)%3F(1231%2Bdisplay_price)%3A((account_id%3D%3D133%7C%7Caccount_id%3D%3D134%7C%7Caccount_id%3D%3D135%7C%7Caccount_id%3D%3D136)%3F(1233%2Bdisplay_price)%3A((account_id%3D%3D262)%3F(1241%2Bdisplay_price)%3A((account_id%3D%3D83%7C%7Caccount_id%3D%3D132%7C%7Caccount_id%3D%3D314%7C%7Caccount_id%3D%3D330)%3F(1258%2Bdisplay_price)%3A((account_id%3D%3D124%7C%7Caccount_id%3D%3D310)%3F(1368%2Bdisplay_price)%3A((account_id%3D%3D155%7C%7Caccount_id%3D%3D325)%3F(1386%2Bdisplay_price)%3A((account_id%3D%3D415)%3F(1392%2Bdisplay_price)%3A((account_id%3D%3D412)%3F(1397%2Bdisplay_price)%3A((account_id%3D%3D84)%3F(1406%2Bdisplay_price)%3A((account_id%3D%3D125%7C%7Caccount_id%3D%3D313)%3F(1432%2Bdisplay_price)%3A((account_id%3D%3D423)%3F(1436%2Bdisplay_price)%3A((account_id%3D%3D181)%3F(1445%2Bdisplay_price)%3A((account_id%3D%3D126%7C%7Caccount_id%3D%3D404)%3F(1448%2Bdisplay_price)%3A((account_id%3D%3D212%7C%7Caccount_id%3D%3D317%7C%7Caccount_id%3D%3D332)%3F(1449%2Bdisplay_price)%3A((account_id%3D%3D236)%3F(1458%2Bdisplay_price)%3A((account_id%3D%3D127)%3F(1469%2Bdisplay_price)%3A((account_id%3D%3D385)%3F(1471%2Bdisplay_price)%3A((account_id%3D%3D241%7C%7Caccount_id%3D%3D243%7C%7Caccount_id%3D%3D411)%3F(1508%2Bdisplay_price)%3A((account_id%3D%3D139%7C%7Caccount_id%3D%3D140%7C%7Caccount_id%3D%3D153%7C%7Caccount_id%3D%3D311)%3F(1512%2Bdisplay_price)%3A((account_id%3D%3D129%7C%7Caccount_id%3D%3D130%7C%7Caccount_id%3D%3D131)%3F(1518%2Bdisplay_price)%3A((account_id%3D%3D148%7C%7Caccount_id%3D%3D149%7C%7Caccount_id%3D%3D174)%3F(1523%2Bdisplay_price)%3A((account_id%3D%3D242)%3F(1529%2Bdisplay_price)%3A((account_id%3D%3D418)%3F(1545%2Bdisplay_price)%3A((account_id%3D%3D326)%3F(1546%2Bdisplay_price)%3A((account_id%3D%3D388)%3F(1549%2Bdisplay_price)%3A((account_id%3D%3D166%7C%7Caccount_id%3D%3D167%7C%7Caccount_id%3D%3D343)%3F(1558%2Bdisplay_price)%3A((account_id%3D%3D329)%3F(1560%2Bdisplay_price)%3A((account_id%3D%3D213)%3F(1566%2Bdisplay_price)%3A((account_id%3D%3D381)%3F(1576%2Bdisplay_price)%3A((account_id%3D%3D154%7C%7Caccount_id%3D%3D312)%3F(1580%2Bdisplay_price)%3A((account_id%3D%3D238%7C%7Caccount_id%3D%3D239%7C%7Caccount_id%3D%3D240)%3F(1581%2Bdisplay_price)%3A((account_id%3D%3D384)%3F(1603%2Bdisplay_price)%3A((account_id%3D%3D128%7C%7Caccount_id%3D%3D410)%3F(1609%2Bdisplay_price)%3A((account_id%3D%3D424)%3F(1677%2Bdisplay_price)%3A((account_id%3D%3D244%7C%7Caccount_id%3D%3D246%7C%7Caccount_id%3D%3D318)%3F(1687%2Bdisplay_price)%3A((account_id%3D%3D247%7C%7Caccount_id%3D%3D320)%3F(1693%2Bdisplay_price)%3A((account_id%3D%3D118%7C%7Caccount_id%3D%3D119%7C%7Caccount_id%3D%3D120%7C%7Caccount_id%3D%3D414)%3F(1739%2Bdisplay_price)%3A((account_id%3D%3D399)%3F(1747%2Bdisplay_price)%3A((account_id%3D%3D192%7C%7Caccount_id%3D%3D193)%3F(1846%2Bdisplay_price)%3A((account_id%3D%3D248%7C%7Caccount_id%3D%3D315)%3F(1874%2Bdisplay_price)%3A((account_id%3D%3D425)%3F(1993%2Bdisplay_price)%3A((account_id%3D%3D195%7C%7Caccount_id%3D%3D196)%3F(2015%2Bdisplay_price)%3A((account_id%3D%3D89)%3F(2033%2Bdisplay_price)%3A((account_id%3D%3D86%7C%7Caccount_id%3D%3D87%7C%7Caccount_id%3D%3D88%7C%7Caccount_id%3D%3D353)%3F(2047%2Bdisplay_price)%3A((account_id%3D%3D355)%3F(2061%2Bdisplay_price)%3A((account_id%3D%3D396)%3F(2066%2Bdisplay_price)%3A((account_id%3D%3D96%7C%7Caccount_id%3D%3D98%7C%7Caccount_id%3D%3D101%7C%7Caccount_id%3D%3D430)%3F(2067%2Bdisplay_price)%3A((account_id%3D%3D257%7C%7Caccount_id%3D%3D258%7C%7Caccount_id%3D%3D260)%3F(2096%2Bdisplay_price)%3A((account_id%3D%3D92)%3F(2102%2Bdisplay_price)%3A((account_id%3D%3D97)%3F(2103%2Bdisplay_price)%3A((account_id%3D%3D259)%3F(2117%2Bdisplay_price)%3A((account_id%3D%3D99)%3F(2123%2Bdisplay_price)%3A((account_id%3D%3D90%7C%7Caccount_id%3D%3D95)%3F(2128%2Bdisplay_price)%3A((account_id%3D%3D217%7C%7Caccount_id%3D%3D218)%3F(2134%2Bdisplay_price)%3A((account_id%3D%3D91)%3F(2146%2Bdisplay_price)%3A((account_id%3D%3D93)%3F(2157%2Bdisplay_price)%3A((account_id%3D%3D104%7C%7Caccount_id%3D%3D111%7C%7Caccount_id%3D%3D114)%3F(2172%2Bdisplay_price)%3A((account_id%3D%3D107%7C%7Caccount_id%3D%3D113%7C%7Caccount_id%3D%3D115%7C%7Caccount_id%3D%3D117%7C%7Caccount_id%3D%3D295)%3F(2178%2Bdisplay_price)%3A((account_id%3D%3D194%7C%7Caccount_id%3D%3D408)%3F(2179%2Bdisplay_price)%3A((account_id%3D%3D103%7C%7Caccount_id%3D%3D106%7C%7Caccount_id%3D%3D112%7C%7Caccount_id%3D%3D297)%3F(2208%2Bdisplay_price)%3A((account_id%3D%3D102%7C%7Caccount_id%3D%3D105%7C%7Caccount_id%3D%3D108%7C%7Caccount_id%3D%3D109%7C%7Caccount_id%3D%3D110%7C%7Caccount_id%3D%3D116%7C%7Caccount_id%3D%3D328)%3F(2214%2Bdisplay_price)%3Adisplay_price)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))&',
                'q.parser=lucene&',
                'size=' + sizePerPage + '&',
                'sort=has_image%20desc%2Cdrivetime%20desc%2Cdistance_sort%20asc%2Chas_price%20desc%2Ctotal_price%20asc%2Cmileage%20asc&',
                'start=' + page
            ].join("");
        }

        return parameters;
    }

    /**
     * Group vehicles by year
     * @param {*} vehicles 
     * @returns 
     */
     groupVehiclesByYear(vehicles) {
        let years = [];
        const todaysDate = new Date()
        const maxAge = this.DBConfig.ENTERPRISE_SCRAPER_MAX_AGE;
        const currentYear = todaysDate.getFullYear();
        let maxYear = currentYear + 1;
        let currentVehicles = {};
    
        for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
            currentVehicles = vehicles.filter( (vehicle) => parseInt(vehicle.year) == year);
            years[year] = currentVehicles;
        }

        return years;
    }

    buildEnterpriseDetailsPageUrl(newVehicle) {
        let detailsUrlByVin = [
            this.DBConfig.ENTERPRISE_BASE_URL,
            this.DBConfig.ENTERPRISE_DETAILS_URL,
            _.get(newVehicle, 'vin')
        ].join("");

        return detailsUrlByVin;
    }

    /**
     *  Build Vehicles from expose api of enterprise
     */
    async buildIndex(year) {

        const apiUrl = this.DBConfig.ENTERPRISE_API_URL;
        let zip = this.DBConfig.ENTERPRISE_ZIP;
        const increment = parseInt(this.DBConfig.ENTERPRISE_PARAMS_PAGE_SIZE);
        let page = 0;
        let totalPages = 1;
        let apiParameters = null;
        let responseJsonData = null;
        let vehicles = [];
        let apiScrapeLimit = 10000; // As per api reference: Request depth (10000) exceeded, limit=10000
        let maxVehicles = this.C.max_vehicle_to_process;
        // maxVehicles = 99999999; //For testing only

        for (let i=1; i <= (totalPages); i++) {
            
            this.log.logScraper("Page: " + i + " Page Rw: " + page + " -> " + apiUrl);

            if (i == 1) {
                page = 0;
                apiParameters = this.apiParameters(page, year);

                responseJsonData = await this.enterpriseApiRequest(apiUrl, apiParameters);
                let totalVehicles = parseInt(_.get(responseJsonData, 'hits.found', 1));

                totalPages = totalVehicles / increment;
                totalPages = parseInt(totalPages % 2 == 0 ? totalPages : totalPages + 1);
                this.log.logScraper("Total Vehicles Found: " + totalVehicles);
                this.log.logScraper("Total Pages: " + totalPages);
                this.log.logScraper("Vehicles per page: " + increment);
            }
            else {
                page += increment;
                
                apiParameters = this.apiParameters(page, year);
                responseJsonData = await this.enterpriseApiRequest(apiUrl, apiParameters);
            }
            
            let parentClass = this;
            let rawVehicles = _.get(responseJsonData, 'hits.hit', [])
                .map( function (vehicle) {

                    let newVehicle = {
                        ...{"id": vehicle.id},
                        ..._.get(vehicle, 'fields')
                    };
        
                    newVehicle['detail_url'] = parentClass.buildEnterpriseDetailsPageUrl(newVehicle);
                    newVehicle['pricings_real'] = JSON.parse(newVehicle['pricings']);

                    return newVehicle;
                });


            this.log.logScraper("Vehicles found in page: " + rawVehicles.length);

            vehicles = [
                ...vehicles,
                ...rawVehicles
            ];

            if (vehicles.length >= apiScrapeLimit) {
                this.log.logScraper("Api Scrape Limit reached. " + apiScrapeLimit);
                break;
            }

            if (vehicles.length >= maxVehicles) {
                vehicles = vehicles.splice(0, maxVehicles);
                this.log.logScraper("Max vehicles reached. " + maxVehicles);
                break;
            }

            await this.helper.sleep(5000);
        }

        this.log.logScraper("Total vehicle fetched: " + vehicles.length);

        return vehicles;
    }

    async getAvailableVehicles(year) {
        try {
            let apiUrl = [
                this.C.app_url,
                "/api/search/vehicles/available",
                "?feed-id=8",
                "&includes=id,vin,year,heading,pricing",
                "&year=" + year,
            ].join("");

            logScraper("Getting available vehicles from database : " + apiUrl + "...");
            let availableVehicles = [];
            await axios.get(apiUrl)
                .then(response => {
                    availableVehicles = response.data;
                })
                .catch(error => {
                    return [];
                });
            
            return availableVehicles;
        } catch (error) {
            
            return [];
        }
    }

    /**
     * Check if zip codepage
     * @param {*} C 
     * @returns boolean
     */
    isZipCodePage(C) {
        let $ = jQuery;

        if(
            $(C.enterprise.selectors.zip_code_page.input_zip).length >= 1 &&
            $(C.enterprise.selectors.zip_code_page.input_zip).is(':visible')
        ) {
            return true;
        }

        return false;
    }

    /**
     * Check if page invite
     * @param {*} C 
     * @returns boolean
     */
    isPageInvite(C) {
        let $ = jQuery;

        if(
            $(C.enterprise.selectors.modals.page_invite).length >= 1 &&
            $(C.enterprise.selectors.modals.page_invite).is(':visible')
        ) {
            return true;
        }

        return false;
    }

    isVinGoodForScraping(vin, pricing, availableDBVehicles) {
        let displayPrice = pricing['price'];

        if (availableDBVehicles.length >= 1) {
            let filtered = availableDBVehicles.filter( (vehicle) => {
                return vin == vehicle.vin;
            });
            
            if (filtered.length >= 1) {
                // vin is found in the database as available
                let filterPricing = filtered[0].pricing;
                let originalPrice = parseInt(filterPricing.price);

                // buyPrice = parseInt((String(buyPrice).replace(/\$/g, '').replace(/,/g, '')));
                // price have no update
                if (originalPrice == displayPrice) return 0;
                // price have been updated
                else return 2;
            }
        }

        let scrapePriceLimit = parseInt(this.C.scrape_price_limit);
        if (displayPrice <= scrapePriceLimit) {
            // rogue dealer
            return -1;
        }
        
        return 1;
    }


    /**
     * Scrape car vehicle details images
     * @param {*} C 
     * @returns array
     */
     scrapeDetailImages(C) {
        let $ = jQuery;
        let imageList = [];
        try {
            let vehicleImageItem = $(C.enterprise.selectors.details_page.img_thumbnail);
            vehicleImageItem.each( function () {

                let img = $(this);
                let imgSrc = String(img.attr("src"));
                let imgArr = imgSrc.split('?');
                imgSrc = imgArr[0];
                imgSrc = imgSrc.replace("//", "");
                imageList.push(imgSrc);
            });

            return imageList;
        } catch (err) {
            return [];
        }
    }

    async collectScrapedVins(feed) {
        let pathFiles = feed.getVinFiles(this.currentYear);

        let jsonData = [];
        let scrapedVins = [];
        for(let index in pathFiles) {
            jsonData = await feed.readJsonFile(pathFiles[index]);
            scrapedVins.push(jsonData);
        }
        
        return scrapedVins;
    }

    async start(year, firstLogin = false, currentAvailableVehicles, feed, browser) {
        this.scrapedVehicles = 0;
        this.currentYear = year;

        let availableDBVehicles = await this.getAvailableVehicles(year);
        this.log.logScraper(availableDBVehicles.length + " available vehicle(s) found in database.");

        let validVehicles = [];

        if (currentAvailableVehicles.length >= 1) {
            this.log.logScraper(currentAvailableVehicles.length + " vehicle(s) found in source.");

            for( let index in currentAvailableVehicles ) {
                let currentVehicle = currentAvailableVehicles[index];
                let vin = currentVehicle['vin'];
        
                let vinsFile = feed.getFileNameVinsFile(vin);
        
                // check vehicle if scraped already
                if (feed.isFileNameVinsFileExist(vin, this.currentYear) == true) {
                    this.log.logScraper(vin + " have already been scraped. skipping this vehicle.", false, "info");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }

                // check record from db here...
                let displayPrice = parseInt(currentVehicle['display_price']);
                let pricing = {
                    'price': displayPrice
                };

                let isGoodForScraping = this.isVinGoodForScraping(vin, pricing, availableDBVehicles);

                // Check if vin exist in db available vehicle and check if price changed
                if (isGoodForScraping == 0) {
                    this.log.logScraper(vin + " is already available in database and has no price changed.", false, "info");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }
                // price have been updated
                else if (isGoodForScraping == 2) {
                    this.log.logScraper(vin + " is already available in database and price have been updated.", false, "info");
                }
                // Rogue dealer found
                else if (isGoodForScraping == -1) {
                    this.log.logScraper(vin + " rogue dealer found. Price: " + displayPrice, false, "error");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }
                
                validVehicles.push(currentVehicle);
            }
            if (validVehicles.length >= 1) {
                this.totalVehicles = validVehicles.length;

                // ZipCode Authentication
                                    
                let buyACarPage = await browser.newPage();

                let buyACarUrl = this.C.enterprise.buy_a_car_url;
                await buyACarPage.goto(buyACarUrl, {waitUntil: 'load', timeout: this.C.timeout});

                // Page Invite
                await buyACarPage.addScriptTag({url: this.C.urls.jquery});
                let isPageInvite = await buyACarPage.evaluate(this.isPageInvite, this.C);
                if (isPageInvite == true) {
                    await buyACarPage.click(this.C.enterprise.selectors.modals.page_invite);
                }

                // Check If Zip Code page
                let isZipCodePage = await buyACarPage.evaluate(this.isZipCodePage, this.C);
                if (isZipCodePage == true) {
                    // goto ZipCode Page
                    let zip = (this.DBConfig.ENTERPRISE_ZIP).toString();
                    await buyACarPage.waitForSelector(this.C.enterprise.selectors.zip_code_page.input_zip, {timeout: this.C.timeout});
                    await buyACarPage.focus(this.C.enterprise.selectors.zip_code_page.input_zip);
                    await buyACarPage.keyboard.down('Control');
                    await buyACarPage.keyboard.press('A');
                    await buyACarPage.keyboard.up('Control');
                    await buyACarPage.keyboard.press('Backspace');

                    await buyACarPage.keyboard.type(zip);
                    await buyACarPage.click(this.C.enterprise.selectors.zip_code_page.button_locate);
                }

                await buyACarPage.close();
                // Multiple Tabs
                const results = await feed.withBrowser(async (browser) => {
                    return bluebird.map(validVehicles, async (currentVehicle, index) => {
                        return feed.withPage(browser)(async (page) => {
                            // Do not load images to prevent storage issue
                            await page.setRequestInterception(true);
                            page.on('request', (request) => {
                                if (['image'].indexOf(request.resourceType()) !== -1) {
                                    // Mock image for fast loading and trick display triggers in details page
                                    request.respond({
                                        status: 200,
                                        contentType: 'image/png',
                                        body: Buffer.from(this.C.image.base64_data, 'base64')
                                    });
                                }
                                // else if (['stylesheet', 'font'].indexOf(request.resourceType()) !== -1) request.abort();
                                else request.continue();
                            });
 
                            let vin = currentVehicle['vin'];
        
                            let vinsFile = feed.getFileNameVinsFile(vin, this.currentYear);

                            let detailUrl = currentVehicle['detail_url'];

                            try {

                                this.log.logScraper(vin + " Surfing & Scraping additional details: " + detailUrl);
    
                                await page.goto(detailUrl, {waitUntil: 'load', timeout: this.C.timeout});
                                await page.addScriptTag({url: this.C.urls.jquery});
                                let isPageInvite = await page.evaluate(this.isPageInvite, this.C);
                                if (isPageInvite == true) {
                                    await page.click(this.C.enterprise.selectors.modals.page_invite);
                                }

                                // Check If Zip Code page
                                let isZipCodePage = await page.evaluate(this.isZipCodePage, this.C);
    
                                if (isZipCodePage == true) {
                                    // goto ZipCode Page
                                    let zip = (this.DBConfig.ENTERPRISE_ZIP).toString();
                                    await page.waitForSelector(this.C.enterprise.selectors.zip_code_page.input_zip, {timeout: this.C.timeout});
                                    await page.focus(this.C.enterprise.selectors.zip_code_page.input_zip);
                                    await page.keyboard.down('Control');
                                    await page.keyboard.press('A');
                                    await page.keyboard.up('Control');
                                    await page.keyboard.press('Backspace');
                
                                    // await page.click(C.enterprise.selectors.zip_code_page.input_zip);
                                    await page.keyboard.type(zip);
                                    await page.click(this.C.enterprise.selectors.zip_code_page.button_locate);
                                }
    
                                await page.waitForSelector(this.C.enterprise.selectors.details_page.section_gallery, {timeout: this.C.timeout});
                                // Inject Jquery
                                await page.addScriptTag({url: this.C.urls.jquery});
                                // wait until all image is loaded
                                await page.waitForFunction('$("'+ this.C.enterprise.selectors.details_page.img_thumbnail +':last").attr("src") != ""');
                                // collect images
                                let vehicleImages = await page.evaluate(this.scrapeDetailImages, this.C);
                                currentVehicle['images'] = vehicleImages;
    
                                // Save data as json file
                                await feed.saveJsonToVinsFile(currentVehicle, vinsFile);

                                // update count index
                                this.scrapedVehicles++;

                                this.log.logScraper(this.scrapedVehicles + "/" + this.totalVehicles + " : " + vin + " " + detailUrl + " Scraped!");

                                return currentVehicle;

                            } catch (error) {
                                this.log.logScraper("Vin: " + vin + " Possible timeout " + detailUrl + " ERROR: " + error);
                                return [];
                            }
                        });
                    }, {concurrency: this.C.maximum_tabs});
                }, browser);
            }
            
            // Collect Scraped vins
            let collectedVehicles = await this.collectScrapedVins(feed);

            let jsonFileName = feed.getJsonVehicleFileNameByYear(year);

            this.log.logScraper(collectedVehicles.length + " vehicle(s) have been saved into: " + jsonFileName, false, "info");
            // Save data as json file
            await feed.saveJsonFile(collectedVehicles, jsonFileName);
            // Move vehicle json file to storage file
            this.log.logScraper("Moving " + jsonFileName + " into " + this.DBConfig.ENTERPRISE_FEED_IMPORT_DESTINATION);
            await feed.moveFeedPerYearFile(jsonFileName, year);
            
            // Clean up scraped vins
            this.log.logScraper("Cleaning scraped vins...");
            feed.cleanUpScrapedVins(this.currentYear);
        }
        else {
            this.log.logScraper("No vehicles made it for year: " + year, false, "error");
        }
    }
}

module.exports = Enterprise;