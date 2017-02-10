var express = require('express'),
    router = express.Router(),
    request = require('request'),
    dateFormat = require('dateformat'),
    farm = require('../../config/farm');

var currentTimer = 60,
    turbines = [],
    turbineList = []; // default values

var status = false,
    chaos = false;

var gwurl = farm.url + farm.port;

//middleware
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// routing 

module.exports = function (app) {
    app.use('/', router);
};

router.get('/', function (req, res, next) {

    res.render('index', {
        title: 'wind farm',
        gwurl: gwurl
    });
});

/*
* set gateway address if needed
* gateway responds with status
*/
router.post('/', function (req, res, next) {

    if (req.body.choice == 'change')
        gwurl = req.body.url;

    request(
        { url: gwurl + farm.deviceAPI, method: 'GET' },
        function (error, response, body) {
            if (error)
                res.render('telemetry', {
                    title: 'wind farm',
                    mdg: 'unknown gateway error',
                    status: false
                });

            else {
                turbineArray = JSON.parse(body);
                for (i = 0; i < turbineArray.length; i++) {
                    turbineList.push(turbineArray[i].TurbinID);
                }
                var message = '[' + gwurl + '] ->' + turbineArray.length + ' turbines in farm';
                res.render('telemetry', {
                    title: 'wind farm',
                    msg: message,
                    status: status
                });
            }
        });
});

/*
* check gateway status - response:
* started (true/false)
* time stamp of last sent message
* message sending frequence
* malfunctioning unit (-1 if all functional)
*/

router.get('/status', function (req, res, next) {
    request(
        {
            url: gwurl + farm.teleAPI,
            json: true,
            method: 'GET',
        },
        function (error, response, body) {
            if (error)
                res.render('telemetry', {
                    title: 'wind farm',
                    mdg: 'unknown gateway error',
                    status: false
                });

            else {
                status = body.status;
                res.render('telemetry', {
                    title: 'wind farm',
                    msg: 'last sent message: ' + dateFormat(body.timestamp, "yyyy-mm-dd h:MM:ss"),
                    status: body.status,
                    chaos: (body.chaos === -1 ? 'none' : body.chaos),
                    frequency: body.frequency
                });
            }
        });
});


router.get('/start', function (req, res, next) {
    if (!status) {
        request(
            {
                url: gwurl + farm.teleAPI + 'start',
                method: 'POST',
                json: true
            },
            function (error, response, body) {
                if (error)
                    res.render('telemetry', {
                        title: 'wind farm',
                        msg: 'unknown gateway error',
                        status: false
                    });
                else {
                    status = true;

                    if (response.statusCode === 200)
                        var message = 'successfully started';
                    else
                        var message = body;

                    res.render('telemetry', {
                        title: 'wind farm',
                        status: status,
                        frequency: false,
                        chaos: false,
                        msg: message
                    });
                }
            });
    }
    else
        res.render('telemetry', {
            title: 'wind farm',
            status: status,
            msg: 'already started'
        });
});

router.get('/stop', function (req, res) {
    if (status) {
        request(
            {
                url: gwurl + farm.teleAPI + 'stop',
                json: true,
                method: 'POST',
            },
            function (error, response, body) {
                if (error)
                    res.render('telemetry', {
                        title: 'wind farm',
                        msg: 'unknown gateway error',
                        status: false
                    });
                else {
                    status = false;
                    res.render('telemetry', {
                        title: 'wind farm',
                        status: status,
                        msg: 'successfully stopped'
                    });
                }

            });
    }
    else
        res.render('telemetry', {
            title: 'wind farm',
            status: status,
            msg: 'not started'
        });


});

router.get('/chaos', function (req, res, next) {
    if (status === true) {
        request(
            { url: gwurl + farm.deviceAPI + 'chaos', method: 'POST' },
            function (error, response, body) {
                if (error)
                    res.render('telemetry', {
                        title: 'wind farm',
                        mdg: 'unknown gateway error',
                        status: false
                    });
                else {
                    if (response.statusCode === 200) {
                        chaos = body;
                        var message = 'chaos started';
                    }
                    else {
                        chaos = false;
                        var message = body;
                    }
                    res.render('telemetry', {
                        title: 'wind farm',
                        msg: message,
                        status: status,
                        chaos: chaos
                    });
                }
            });
    }
    else
        res.render('telemetry', {
            title: 'wind farm',
            msg: 'telemetry not started',
            status: status
        });

});

router.get('/reset', function (req, res, next) {
    if (status === true) {
        request(
            { url: gwurl + farm.deviceAPI + 'reset', method: 'POST' },
            function (error, response, body) {
                if (error)
                    res.render('telemetry', {
                        title: 'wind farm',
                        mdg: 'unknown gateway error',
                        status: false
                    });
                else {
                    if (response.statusCode === 200)
                        var message = 'unit restarted';
                    else
                        var message = body;
                }
                res.render('telemetry', {
                    title: 'wind farm',
                    msg: message,
                    status: status,
                    chaos: false,
                    frequency: false
                });
            });
    }
    else
        res.render('telemetry', {
            title: 'wind farm',
            msg: 'telemetry not started',
            status: status
        });
});

/*
 global settings
 */
router.get('/gs', function (req, res) {
    request({
        url: gwurl + farm.teleAPI,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    },
        function (error, response, body) {
            if (error)
                res.render('telemetry', {
                    title: 'wind farm',
                    mdg: 'unknown gateway error',
                    status: false
                });
            else
                res.render('global_settings', {
                    title: 'wind farm',
                    currentTimer: JSON.parse(body).frequency
                });
        });
});

router.post('/gs', function (req, res) {
    timer = req.body.interval;

    request({
        url: gwurl + farm.teleAPI,
        method: 'POST',
        json: {
            timer: req.body.interval,
            msgTpye: 'short' // keep this hard coded for the moment
        }
    },
        function (error, response, body) {
            if (error)
                res.render('telemetry', {
                    title: 'wind farm',
                    mdg: 'unknown gateway error',
                    status: false
                });
            else
                res.render('global_settings', {
                    title: 'wind farm',
                    currentTimer: req.body.interval
                });
        });
});

/*
 device settings
 */
router.get('/dm', function (req, res, next) {
    res.render('device_selector',
        {
            title: 'wind farm',
            deviceIDs: turbineList
        });
});

router.post('/dm', function (req, res) {
    idx = Number(req.body.deviceIdx);
    res.render('display', {
        title: 'wind farm',
        msg: 'future implementation'
    });
});

router.post('/device_properties', function (req, res) {

    if (req.body.ActivePower)
        turbineArray[idx].ActivePower = req.body.ActivePower;
    if (req.body.WindDirection)
        turbineArray[idx].WindDirection = req.body.WindDirection;
    if (req.body.WindSpeed)
        turbineArray[idx].WindSpeed = req.body.WindSpeed;
    if (req.body.NacelleDirection)
        turbineArray[idx].NacelleDirection = req.body.NacelleDirection;
    if (req.body.Production)
        turbineArray[idx].Production = req.body.Production;
    if (req.body.TurbineStatus)
        turbineArray[idx].TurbineStatus = req.body.TurbineStatus;
    if (req.body.GearOilTemp)
        turbineArray[idx].GearOilTemp = req.body.GearOilTemp;
    if (req.body.GeneratorRPM)
        turbineArray[idx].GeneratorRPM = req.body.GeneratorRPM;
    if (req.body.GearPresAvg)
        turbineArray[idx].GearPresAvg = req.body.GearPresAvg;
    if (req.body.NacelTmpAvg)
        turbineArray[idx].NacelTmpAvg = req.body.NacelTmpAvg;
    if (req.body.RotorRPM)
        turbineArray[idx].RotorRPM = req.body.RotorRPM;
    if (req.body.AmbTemp)
        turbineArray[idx].AmbTemp = req.body.AmbTemp;

    var now = new Date();
    turbineArray[idx].Time = now;

    request({
        url: gwurl + farm.deviceAPI,
        method: 'PUT',
        json: {
            index: idx,
            turbine: turbineArray[idx]
        }
    },
        function (error, response, body) {
            if (error)
                res.render('telemetry', {
                    title: 'wind farm',
                    mdg: 'unknown gateway error',
                    status: false
                });
            else
                res.render('display', {
                    title: 'wind farm', msg: 'future implementation'
                });
        })
});