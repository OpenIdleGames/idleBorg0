//Controller file
/*global angular, console*/
angular.module('gameApp').controller('GameController', ['$scope', '$location', '$interval', '$route', '$localStorage', '$window', '$http', '$sessionStorage', function ($scope, $location, $interval, $route, $localStorage, $window, $http, $sessionStorage) {
    'use strict';
    $scope.generateUpgradeTemplateForDevice = function (device) {
        var newUpgrades = {}, compressionReq = {}, networkReq = {}, obfuscateReq = {}, quantumReq = {};
        newUpgrades.inject = function (id, deviceID, name, description, icon, iconFontID, cpuCostBase, cpuCostIncrement, requirement) {
            newUpgrades.items.push({
                id: id,
                deviceID: deviceID,//the device this
                name: name,
                description: description,
                icon: icon,
                iconFontID: iconFontID,
                cpuCostBase: cpuCostBase,
                cpuCostIncrement: cpuCostIncrement,
                requirement: requirement
            });
        };
        //reset object
        newUpgrades.items = [];

        compressionReq.items = [];
        compressionReq.inject = function (id, type, ref, value) { compressionReq.items.push({id: id, type: type, ref: ref, value: value}); };
        compressionReq.inject(compressionReq.items.length, 'device', device.id, 10);//10 mobiles
        compressionReq.inject(compressionReq.items.length, 'science', 0, 1);//compression
        //this generates 8 stock templates, 1 for each device, and gives them names.
        newUpgrades.inject(newUpgrades.items.length, device.id, 'Compression', 'Increase storage and data rates by 10% per level. Multiplicative.', 'material-icons', 'call_merge', 125 * device.cpuCostBase, 1.2, compressionReq.items);

        networkReq.items = [];
        networkReq.inject = function (id, type, ref, value) { networkReq.items.push({id: id, type: type, ref: ref, value: value}); };
        networkReq.inject(networkReq.items.length, 'device', device.id, 25);
        networkReq.inject(networkReq.items.length, 'science', 1, 1);//networking
        newUpgrades.inject(newUpgrades.items.length, device.id, 'Optimization', 'Use clustering to combat network loss by 10% per level. Additive.', 'material-icons', 'call_split', 25e2 * device.cpuCostBase, 1.3, networkReq.items);

        obfuscateReq.items = [];
        obfuscateReq.inject = function (id, type, ref, value) { obfuscateReq.items.push({id: id, type: type, ref: ref, value: value}); };
        obfuscateReq.inject(obfuscateReq.items.length, 'device', device.id, 50);
        obfuscateReq.inject(obfuscateReq.items.length, 'science', 2, 1);//network security
        newUpgrades.inject(newUpgrades.items.length, device.id, 'Encryption', 'Reduce your risk factor by 5% per level, multiplicative.', 'material-icons', 'shuffle', 50e3 * device.cpuCostBase, 1.4, obfuscateReq.items);

        quantumReq.items = [];
        quantumReq.inject = function (id, type, ref, value) { quantumReq.items.push({id: id, type: type, ref: ref, value: value}); };
        quantumReq.inject(quantumReq.items.length, 'device', device.id, 100);
        quantumReq.inject(quantumReq.items.length, 'device', 7, 1);//you must have at least 1 quantum computer.
        quantumReq.inject(quantumReq.items.length, 'science', 3, 1);//quantum entanglement
        newUpgrades.inject(newUpgrades.items.length, device.id, 'Quantum Entanglement', 'Increase device power and reduce risk.', 'material-icons', 'timeline', 100e4 * device.cpuCostBase, 1.5, quantumReq.items);

        device.upgradeList = newUpgrades.items;
    };


    $scope.getScienceMeta = function (scienceID) {
        var i;
        for (i = 0; i < $scope.scienceMeta.items.length; i += 1) {
            if ($scope.scienceMeta.items[i].id === scienceID) {
                return $scope.scienceMeta.items[i];
            }
        }
        return null;
    };

    $scope.msBetweenTicks = 1000;
    $scope.getTickInterval = function () {
        return ($scope.msBetweenTicks / Math.pow(2, $scope.getScienceMeta(4).count));
    };

    $scope.resetGameInterval = function () {
        if (angular.isDefined($scope.gameInterval)) {
            $interval.cancel($scope.gameInterval);
        }
        $scope.gameInterval = $interval(function () { $scope.gameTick(); }, $scope.getTickInterval());
    };

    $scope.isPropertyPlayerData = function (property) {
        return property === 'count' || property === 'unlocked' || property === 'disabled' || property === 'suppressed' || property === 'compressionLevel' || property === 'networkLevel' || property === 'quantumLevel' || property === 'riskPercent' || property === 'offsetCount' || property === 'riskLevel';
    };

    $scope.isPropertyMetaData = function (property) {
        return property === 'upgradeList'  || property === 'requirement';
    };

    $scope.load = function (forceReset) {
        var i, j, requirementTemplate, copyUpgrades, now, msSinceTimestamp, deviceMeta, playerDeviceMeta, deviceProperty, upgradeProperty, requirementProperty, upgrade, requirement, scienceMeta, playerScienceMeta, scienceProperty;
        //requirement and upgrade are one-offs, they don't need to be saved.
        requirementTemplate = {};
        requirementTemplate.items = [];
        requirementTemplate.clear = function () {
            requirementTemplate.items = [];
        };
        requirementTemplate.inject = function (id, type, ref, value) {
            requirementTemplate.items.push({
                id: id,
                type: type,//best values for these are gonna be: device,work,science,evolve,upgrade
                ref: ref,//the id of the object your requirement.. requires
                value: value//the count must be this or higher
            });
        };

        //metas are going to be our lists of things. They take up a lot of space, but they save tons of time in the long run.
        //these hold all our [forward-facing] info concerning the devices, abilities, upgrades, evolutions, work options, et al, throughout the game.
        //firstly, this is the list of devices for the Data tab, categorized broadly for simplicity.
        $scope.deviceMeta = {};
        $scope.getDeviceMeta = function (deviceID) {
            var i;
            for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
                if ($scope.deviceMeta.items[i].id === deviceID) {
                    return $scope.deviceMeta.items[i];
                }
            }
        };
        $scope.deviceMeta.items = [];
        $scope.deviceMeta.inject = function (id, name, description, icon, iconFontID, cpuBase, riskBase, storage, cpuCostIncrement, riskIncrement, cpuCostBase, requirement, upgradeList) {
            $scope.deviceMeta.items.push({
                id: id, //the id we refer to the device as, for stability reasons.
                name: name, //friendly name of the device hack 'tier', of which there were 8 at the time of writing.
                description: description, //brief cue-card description of the device and its drawbacks
                icon: icon, //the class name of the icon this device uses for its snazzy button. sometimes a second param is needed (see below)
                iconFontID: iconFontID, //the icon 'name' gets replaced with the font. Leave this an empty string if it's handled fully in-class.
                cpuBase: cpuBase, //this is how much cpu a single unit generates per tick. a tick isn't an exact measurement of time. you can upgrade your 'tps'
                riskBase: riskBase, //this is the 'risk factor' of the device against the size of your world. Smaller worlds are harder!
                storage: storage, //this is how much the device can store. This gets used more later.
                cpuCostIncrement: cpuCostIncrement, //each level costs [x][previous cost] more, where x is the coefficient below
                riskIncrement: riskIncrement, //same as above but for risk. you can see that risk grows faster than cpu for this device.
                cpuCostBase: cpuCostBase, //the initial cost to aquire a single mobile device.
                requirement: requirement,//the requirement for this device. some devices don't have requirements.
                upgradeList: upgradeList,//the template of upgrades belonging to this device. each one has a set and they're mostly the same.
                count: 0, //how many of a device you have hacked. This determines cost and other things.
                offsetCount: 0, //this is a count you get without factoring into costs, among other things.
                riskLevel: 0, //this is the risk-negation ability, it reduces your risk from a device.
                riskPercent: 0,
                unlocked: false, //tells the browser to hide the item and prevents you from buying it.
                disabled: 0, //disabling devices completely removes their risk and lets you lie dormant, but sacrifices all the cpu they would generate.
                suppressed: 0, //suppression is an ability for making devices less risky at the expense of cpu.
                compressionLevel: 0, //compression lets you store more data by making everything you're storing smaller.
                networkLevel: 0, //network factor is bad. the bigger it gets, the less cpu your devices generates. It starts being a problem immediately.
                quantumLevel: 0 //quantum threading is even better. Unlocking this upgrade for each device is really hard though.
            });
        };

        $scope.workMeta = {};
        $scope.workMeta.items = [];
        $scope.workMeta.inject = function (id, name, description, icon, iconFontID, cpuBase, riskBase, storage, cpuCostIncrement, riskIncrement, cpuCostBase, requirement) {
            $scope.workMeta.items.push({
                id: id, //the id we refer to the work as, for stability reasons.
                name: name, //friendly name of the work
                description: description, //brief cue-card description of the work
                icon: icon, //the class name of the icon this work uses
                iconFontID: iconFontID, //the icon 'name' which gets replaced with the font - this is for when a font item needs to use the & in markup
                riskBase: riskBase, //this is the 'risk factor' of the job.
                cpuCostIncrement: cpuCostIncrement, //each level costs [x][previous cost] more, where x is the coefficient below
                riskIncrement: riskIncrement, //same as above but for risk. you can see that risk grows faster than cpu for this job.
                cpuCostBase: cpuCostBase, //the cost of a single "cycle" of this work item.
                requirement: requirement
            });
        };

        $scope.scienceMeta = {};
        $scope.scienceMeta.items = [];
        $scope.scienceMeta.inject = function (id, name, desc, icon, iconFontID, cpuCost, cpuCostIncrement, requirement, max) {
            $scope.scienceMeta.items.push({
                id: id,
                name: name,
                description: desc,
                icon: icon,
                iconFontID: iconFontID,
                cpuCostBase: cpuCost,
                cpuCostIncrement: cpuCostIncrement,
                requirement: requirement,
                count: 0,
                max: max
            });
        };

        $scope.getNameForTooltip = function (name) {
            return '<span class=\'tooltip-name\'>' + name + '</span>';
        };

        $scope.getPriceForTooltip = function (cost) {
            return '<br><span class=\'tooltip-cost\'>' + $scope.display(cost) + 'B</span>';
        };

        //this is where I'm creating the science types for the player to research, their descriptions, requirements, etc.
        $scope.scienceMeta.inject(0, 'Compression', 'Improve storage by shrinking data, and increase throughput. Enables Compression on each device: 10% per level, multiplicative.<br />', 'material-icons', 'call_merge', 240, 1, {}, 1);
        $scope.scienceMeta.inject(1, 'Optimization', 'Use clustering to turn network loss into gains. Enables Optimization on each device, improving network efficiency by 10% per level, additive.', 'material-icons', 'call_split', 3.6e5, 1, {}, 1);
        $scope.scienceMeta.inject(2, 'Encryption', 'Reduce the likelihood of being detected, allowing you to spread further. Enables Encryption on each device, increasing the safety of your holdings by 5% per level, multiplicative.', 'material-icons', 'shuffle', 4.8e8, 1, {}, 1);
        $scope.scienceMeta.inject(3, 'Quantum Entanglement', 'Quickly scaling improvements to device performance on a global level. Effects are dependent on other quantum entanglement devices.', 'material-icons', 'timeline', 6e11, 1, {}, 1);
        $scope.scienceMeta.inject(4, 'Time Dilation', 'Increase the speed factor of your processors.', 'material-icons', 'fast_forward', 1e4, 200, {}, 5);
        $scope.scienceMeta.inject(5, 'Improbability Generator', 'Capable of generating finite amounts of improbability.', 'material-icons', 'local_cafe', 7.2e14, 1, {}, 1);


        //devices, how much they cost, descriptions, template stuff.
        //when a device has requirements, the requirements template gets cleared() and then I inject the requirements into it, prior to
        //creating that object as a property inside the device's meta, which effectively clones it. I reuse the requirementTemplate repeatedly.
        //the upgrade template method is similar, it creates the same upgrade template for each item, but it does it by ID so we can track them separately.
        $scope.deviceMeta.inject(0, 'Mobile', 'Portability and proximity to users makes mobile devices risky to hold.', 'material-icons', 'smartphone', 1, 1, 2e3, 1.07, 1.09, 2, {});
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(0));

        $scope.deviceMeta.inject(1, 'Personal', 'Private computer access has improved risk factor over mobile devices.', 'material-icons', 'laptop', 10, 3, 2e4, 1.08, 1.085, 120, {});
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(1));

        $scope.deviceMeta.inject(2, 'Workstation', 'Designed for multitasking. Exploited stacks are safe and very powerful.', 'fa fa-server', '', 100, 6, 2e5, 1.09, 1.08, 7200, {});
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(2));

        requirementTemplate.clear();
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 1, 1);
        $scope.deviceMeta.inject(3, 'Database', 'A database built for moving large amounts of information, very fast.', 'fa fa-database', '', 1e3, 10, 2e6, 1.10, 1.075, 432e3, requirementTemplate.items);
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(3));

        requirementTemplate.clear();
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 1, 1);
        $scope.deviceMeta.inject(4, 'Academic Server', 'An extremely powerful server designed to do statistical analysis.', 'fa fa-university', '', 1e4, 15, 2e7, 1.11, 1.07, 2592e4, requirementTemplate.items);
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(4));

        requirementTemplate.clear();
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 1, 1);
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 2, 1);
        $scope.deviceMeta.inject(5, 'Government Server', 'A government supercomputer that puts common computing to shame.', 'fa fa-gavel', '', 1e5, 21, 2e8, 1.12, 1.065, 15552e5, requirementTemplate.items);
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(5));

        requirementTemplate.clear();
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 1, 1);
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 2, 1);
        $scope.deviceMeta.inject(6, 'Nanocomputer', 'A privately developed nanoscopic machine with incredible processing power.', 'fa fa-microchip', '', 1e6, 28, 2e9, 1.13, 1.06, 93312e6, requirementTemplate.items);
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(6));

        requirementTemplate.clear();
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 1, 1);
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 2, 1);
        requirementTemplate.inject(requirementTemplate.items.length, 'science', 3, 1);
        $scope.deviceMeta.inject(7, 'Quantum Computer', 'A world-collaborative physical marvel, capable of moving vast amounts of data.', 'fa fa-ravelry', '', 1e7, 36, 2e10, 1.14, 1.55, 559872e7, requirementTemplate.items);
        $scope.generateUpgradeTemplateForDevice($scope.getDeviceMeta(7));

        if ($localStorage.deviceMeta !== undefined && !forceReset) {
            $scope.buyMode = $localStorage.buyMode; //buymode is how many devices you're trying to buy at once.1,10,100,0[max] in that order. Defaults to 1.
            $scope.data = $localStorage.data; //your player data, this is your primary resource at the beginning.
            $scope.population = $localStorage.population; //a bit nebulous: more people means it's easier to hide, less people means higher risk.

            //this is a subroutine devoted to updating the localstorage's templates so they can get updates without breaking player saves.
            //sorry for this mess, here there be dragons.
            for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
                deviceMeta = $scope.deviceMeta.items[i];
                playerDeviceMeta = $localStorage.deviceMeta.items[i];
                for (deviceProperty in deviceMeta) {
                    if (deviceMeta.hasOwnProperty(deviceProperty)) {
                        if (playerDeviceMeta.hasOwnProperty(deviceProperty)) {
                            if (!$scope.isPropertyPlayerData(deviceProperty) && !$scope.isPropertyMetaData(deviceProperty)) {
                                //if devices property changed and it isn't a player property (like how many you bought), update it.
                                if (deviceMeta[deviceProperty] !== playerDeviceMeta[deviceProperty]) {
                                    playerDeviceMeta[deviceProperty] = deviceMeta[deviceProperty];
                                }
                            }
                            if (deviceProperty === 'upgradeList') {
                                //console.log('looking at upgradelist for ' + deviceMeta.name);
                                for (j = 0; j < deviceMeta[deviceProperty].length; j += 1) {
                                    upgrade = deviceMeta[deviceProperty][j];
                                    for (upgradeProperty in upgrade) {
                                        if (upgrade.hasOwnProperty(upgradeProperty)) {
                                            if (!$scope.isPropertyPlayerData(upgradeProperty) && !$scope.isPropertyMetaData(upgradeProperty)) {
                                                if (deviceMeta[deviceProperty][j][upgradeProperty] !== playerDeviceMeta[deviceProperty][j][upgradeProperty]) {
                                                    //this is a dive into each device's upgrade template, to do the same thing as above, update it.
                                                    playerDeviceMeta[deviceProperty][j][upgradeProperty] = deviceMeta[deviceProperty][j][upgradeProperty];
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if (deviceProperty === 'requirement') {
                                //console.log('looking at requirements for ' + deviceMeta.name);
                                for (j = 0; j < deviceMeta[deviceProperty].length; j += 1) {
                                    requirement = deviceMeta[deviceProperty][j];
                                    for (requirementProperty in requirement) {
                                        if (requirement.hasOwnProperty(requirementProperty)) {
                                            if (!$scope.isPropertyPlayerData(requirementProperty) && !$scope.isPropertyMetaData(requirementProperty)) {
                                                if (deviceMeta[deviceProperty][j][requirementProperty] !== playerDeviceMeta[deviceProperty][j][requirementProperty]) {
                                                    //this is a dive into each device's requirement template, to do the same thing as above, update it.
                                                    playerDeviceMeta[deviceProperty][j][requirementProperty] = deviceMeta[deviceProperty][j][requirementProperty];
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

            //same subroutine as above, but for science.
            for (i = 0; i < $scope.scienceMeta.items.length; i += 1) {
                scienceMeta = $scope.scienceMeta.items[i];
                playerScienceMeta = $localStorage.scienceMeta.items[i];
                for (scienceProperty in scienceMeta) {
                    if (scienceMeta.hasOwnProperty(scienceProperty)) {
                        if (playerScienceMeta.hasOwnProperty(scienceProperty)) {
                            if (!$scope.isPropertyPlayerData(scienceProperty) && !$scope.isPropertyMetaData(scienceProperty)) {
                                //if devices property changed and it isn't a player property (like how many you bought), update it.
                                if (scienceMeta[scienceProperty] !== playerScienceMeta[scienceProperty]) {
                                    playerScienceMeta[scienceProperty] = scienceMeta[scienceProperty];
                                }
                            }
                            if (scienceProperty === 'requirement') {
                                //console.log('looking at requirements for ' + scienceMeta.name);
                                for (j = 0; j < scienceMeta[scienceProperty].length; j += 1) {
                                    requirement = scienceMeta[scienceProperty][j];
                                    for (requirementProperty in requirement) {
                                        if (requirement.hasOwnProperty(requirementProperty)) {
                                            if (!$scope.isPropertyPlayerData(requirementProperty) && !$scope.isPropertyMetaData(requirementProperty)) {
                                                if (scienceMeta[scienceProperty][j][requirementProperty] !== playerScienceMeta[scienceProperty][j][requirementProperty]) {
                                                    //this is a dive into each device's requirement template, to do the same thing as above, update it.
                                                    playerScienceMeta[scienceProperty][j][requirementProperty] = scienceMeta[scienceProperty][j][requirementProperty];
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


            $scope.deviceMeta = $localStorage.deviceMeta;
            $scope.scienceMeta = $localStorage.scienceMeta;
            $scope.workMeta = $localStorage.workMeta;
            $scope.buyMode = $localStorage.buyMode;
        } else {
            $scope.buyMode = 1; //buymode is how many devices you're trying to buy at once.1,10,100,0[max] in that order. Defaults to 1.
            $scope.data = 0; //your player data, this is your primary resource at the beginning.
            $scope.population = 8e9;
        }
        $scope.resetGameInterval();
        $scope.displayStorageActive = 0;
        //here's the very last minute, where we check to see if our timestamps don't line up. we do something cool if they don't.
        now = new Date().valueOf();

        if (now > $localStorage.lastSaved) {
            msSinceTimestamp = now - $localStorage.lastSaved;
        }

        $localStorage.lastSaved = new Date().valueOf();
        $scope.save();//forces a wipe to save over old file.
    };

    $scope.save = function () {
        $localStorage.deviceMeta = $scope.deviceMeta;
        $localStorage.workMeta = $scope.workMeta;
        $localStorage.scienceMeta = $scope.scienceMeta;
        $localStorage.data = $scope.data;
        $localStorage.buyMode = $scope.buyMode;
        $localStorage.population = $scope.population;
        $localStorage.lastSaved = new Date().valueOf();
        $localStorage.permanentlyUnlockScience = $scope.permanentlyUnlockScience;
    };

    $scope.load(false);

    $scope.hasDevice = function () {
        var i;
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            if ($scope.deviceMeta.items[i].count > 0) {
                return true;
            }
        }
        return false;
    };

    $scope.getFillColor = function (number) {
        if (number >= 0.9) {
            return 'progress-bar-danger fg-white';
        }
        return 'progress-bar-info fg-black';
    };

    $scope.getScienceCost = function (science) {
        return science.cpuCostBase * Math.pow(science.cpuCostIncrement, science.count);
    };

    $scope.buyScience = function (science) {
        if (!$scope.canBuyScience(science)) {
            return;
        }
        $scope.data -= $scope.getScienceCost(science);
        science.count += 1;
        if (science.id === 4) {
            //special case here for "Time Dilation" - it speeds up time.
            $scope.resetGameInterval();
        }
        $scope.save();
    };

    $scope.canBuyScience = function (science) {
        return $scope.data >= $scope.getScienceCost(science) && science.count < science.max;
    };

    $scope.getSuppressionCPUFactor = function (device) {
        //stub, placeholder for what will eventually be the suppression ability formula, which will let you reduce your risk by more than it reduces your CPU.
        //the base formula is going to be a slider from 0 to 100% that cuts CPU in half but cuts RISK by 75% for x% of a given device.
        //all this formula concerns itself with is CPU. This is probably gonna change later, a lot.
        var suppCoeff = (device.suppressed / 2) + (1 - device.suppressed);
        return suppCoeff;
    };

    $scope.setTab = function (tabName) {
        $scope.selectedTab = tabName;
    };

    $scope.hackDevice = function (deviceID, count) {
        var deviceMeta = $scope.getDeviceMeta(deviceID);
        deviceMeta.count += count;
        $scope.save();
    };

    $scope.scienceAvailable = function () {
        if ($scope.permanentlyUnlockScience) {
            return true;
        }
        var i, sciObj;
        for (i = 0; i < $scope.scienceMeta.items.length; i += 1) {
            sciObj = $scope.scienceMeta.items[i];
            if (sciObj.count > 0 || $scope.canBuyScience(sciObj)) {
                $scope.permanentlyUnlockScience = true;
                return true;
            }
        }
        return false;
    };

    $scope.hasScience = function (science) {
        return science.count > 0;
    };

    $scope.isScienceMaxed = function (science) {
        return science.count === science.max;
    };

    $scope.workAvailable = function () {
        return false;//stub
    };

    $scope.removeDevice = function (deviceID) {
        var deviceMeta = $scope.getDeviceMeta(deviceID);
        deviceMeta.count -= 1;
        $scope.save();
    };

    $scope.getDeviceRisk = function (device) {
        var i, deviceMeta = $scope.getDeviceMeta(device.id), riskTotal = 0, riskCoeff;
        for (i = 0; i < device.count; i += 1) {
            riskCoeff = Math.pow(deviceMeta.riskIncrement, i);
            riskTotal += deviceMeta.riskBase * riskCoeff;
        }
        if (deviceMeta.riskLevel > 0 || deviceMeta.quantumLevel > 0) {
            riskTotal *= Math.pow(0.95, deviceMeta.riskLevel + (deviceMeta.quantumLevel / 2));
        }
        return riskTotal;
    };

    $scope.getDeviceRiskForDisplay = function (device) {
        if ($scope.getDeviceRisk(device) === 0) {
            return 0;
        }
        var riskAgainst;
        riskAgainst = $scope.population / $scope.getDeviceRisk(device);
        return riskAgainst;
    };

    $scope.getDeviceRiskForGauge = function (device) {
        return 100 / $scope.getDeviceRiskForDisplay(device);
    };

    $scope.getTicksPerSecond = function () {
        //stub, placeholder value right now is gonna default to 5 (200ms interval) until I can do shmancy shit with upgrades or whatever
        return Math.pow(2, $scope.getScienceMeta(4).count);
    };

    $scope.getCPUGenerated = function (deviceID) {
        var deviceMeta, device;
        deviceMeta = $scope.getDeviceMeta(deviceID);
        device = $scope.getDeviceMeta(deviceID);
        return ((device.count + device.offsetCount) * deviceMeta.cpuBase) * $scope.getDeviceCPUFactor(device);
    };

    $scope.getDeviceCPUFactor = function (device) {
        return $scope.getSuppressionCPUFactor(device) * $scope.getDeviceNetworkFactor(device) * $scope.getDeviceQuantumFactor(device) * $scope.getDeviceCompressionFactor(device);
    };

    $scope.getDeviceNetworkFactor = function (device) {
        return Math.pow(0.995, device.count) + (device.networkLevel / 10);
    };

    $scope.getDeviceQuantumFactor = function (device) {
        return Math.pow(1.02, device.quantumLevel);
    };

    $scope.getDeviceCompressionFactor = function (device) {
        return $scope.getCompressionFactor(device.compressionLevel);
    };

    $scope.getCompressionFactor = function (compressionLevel) {
        return Math.pow(1.1, compressionLevel);
    };

    $scope.installClick = function () {
        //doesn't assume you don't have a phone - evolution abilities may later support advanced placement starts.
        if ($scope.population <= 0) {
            $scope.population = 1;
        }
        $scope.hackDevice(0, 1);
    };

    $scope.processStorage = function () {
        $scope.displayStorageActive = $scope.data * 100.0 / $scope.getDeviceStorageMax();
        var i, deviceMeta, storagePartitions = [];
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            deviceMeta = $scope.deviceMeta.items[i];
            //storagePartitions.push($scope.deviceMeta)
        }
    };

    $scope.gameTick = function () {
        $scope.processStorage();
        $scope.processRisk();
        //here's where magic happens, such as data being incremented.
        $scope.data = Math.min($scope.getDeviceStorageMax(), $scope.data + $scope.getTickCPU());
        $scope.processUnlocks();
    };

    $scope.processUnlocks = function () {
        var i, deviceMeta, scienceMeta;
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            deviceMeta = $scope.deviceMeta.items[i];
            if (!deviceMeta.unlocked) {
                if (deviceMeta.cpuCostBase <= $scope.data * 5) {
                    deviceMeta.unlocked = true;
                }
            }
        }
        for (i = 0; i < $scope.scienceMeta.items.length; i += 1) {
            scienceMeta = $scope.scienceMeta.items[i];
            if (!scienceMeta.unlocked) {
                if (scienceMeta.cpuCostBase <= $scope.data * 5) {
                    scienceMeta.unlocked = true;
                }
            }
        }
    };

    $scope.getDeviceStorageMax = function (deviceID) {
        var i, deviceMeta, storageTotal;
        storageTotal = 0;
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            deviceMeta = $scope.deviceMeta.items[i];
            if (deviceID !== null) {
                if (deviceMeta.id === deviceID) {
                    return (deviceMeta.count + deviceMeta.offsetCount) * deviceMeta.storage * $scope.getDeviceCompressionFactor(deviceMeta) * $scope.getDeviceCompressionFactor(deviceMeta) * $scope.getDeviceQuantumFactor(deviceMeta);
                }
            }

            storageTotal += (deviceMeta.count + deviceMeta.offsetCount) * deviceMeta.storage * $scope.getDeviceCompressionFactor(deviceMeta) * $scope.getDeviceCompressionFactor(deviceMeta) * $scope.getDeviceQuantumFactor(deviceMeta);
        }
        return storageTotal;
    };

    $scope.processRisk = function () {
        var i, deviceMeta;
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            deviceMeta = $scope.deviceMeta.items[i];
            if (deviceMeta.count > 0 && $scope.getDeviceRisk(deviceMeta) > 0) {
                if (Math.random() < 1.0 / ($scope.population / $scope.getDeviceRisk(deviceMeta))) {
                    $scope.removeDevice(deviceMeta.id);
                }
            }
            //this sets the scope risk for the object in question
            deviceMeta.riskPercent = 100.0 / ($scope.population / $scope.getDeviceRisk(deviceMeta));
        }
    };

    $scope.getTickCPU = function () {
        var i, cpuFromDevice, cpuTotal;
        cpuTotal = 0;
        for (i = 0; i < $scope.deviceMeta.items.length; i += 1) {
            cpuFromDevice = $scope.getCPUGenerated($scope.deviceMeta.items[i].id);
            cpuTotal += cpuFromDevice;
        }
        return cpuTotal;
    };

    $scope.hasData = function () {
        return $scope.data > 0;
    };

    $scope.requirementsMet = function (requirement) {
        var i, isMet = true, reqObj;
        for (i = 0; i < requirement.length; i += 1) {
            reqObj = requirement[i];
            switch (reqObj.type) {
            case 'device':
                if ($scope.getDeviceMeta(reqObj.ref).count < reqObj.value) {
                    isMet = false;
                }
                break;
            case 'science':
                if ($scope.getScienceMeta(reqObj.ref).count < reqObj.value) {
                    isMet = false;
                }
                break;
            default:
                isMet = false;
                break;
            }
        }
        return isMet;
    };

    $scope.buyUpgrade = function (upgrade) {
        if (!$scope.canBuyUpgrade(upgrade)) { return; }
        $scope.data -= $scope.getUpgradeCost(upgrade);
        var deviceMeta = $scope.getDeviceMeta(upgrade.deviceID);
        switch (upgrade.id) {
        case 0://compression
            deviceMeta.compressionLevel += 1;
            break;
        case 1://networking
            deviceMeta.networkLevel += 1;
            break;
        case 2://obfuscation
            deviceMeta.riskLevel += 1;
            break;
        case 3://quantum
            deviceMeta.quantumLevel += 1;
            break;
        }
        $scope.save();
    };

    $scope.getUpgradeCost = function (upgrade) {
        var deviceMeta = $scope.getDeviceMeta(upgrade.deviceID), cost = 0;
        switch (upgrade.id) {
        case 0://compression
            cost = upgrade.cpuCostBase * Math.pow(upgrade.cpuCostIncrement, deviceMeta.compressionLevel);
            break;
        case 1://networking
            cost = upgrade.cpuCostBase * Math.pow(upgrade.cpuCostIncrement, deviceMeta.networkLevel);
            break;
        case 2://obfuscation
            cost = upgrade.cpuCostBase * Math.pow(upgrade.cpuCostIncrement, deviceMeta.riskLevel);
            break;
        case 3://quantum
            cost = upgrade.cpuCostBase * Math.pow(upgrade.cpuCostIncrement, deviceMeta.quantumLevel);
            break;
        }
        return cost;
    };

    $scope.getUpgradeLevel = function (upgrade) {
        var deviceMeta = $scope.getDeviceMeta(upgrade.deviceID), count = 0;
        switch (upgrade.id) {
        case 0://compression
            count = deviceMeta.compressionLevel;
            break;
        case 1://networking
            count = deviceMeta.networkLevel;
            break;
        case 2://obfuscation
            count = deviceMeta.riskLevel;
            break;
        case 3://quantum
            count = deviceMeta.quantumLevel;
            break;
        }
        return count;
    };

    $scope.canBuyUpgrade = function (upgrade) {
        return $scope.data >= $scope.getUpgradeCost(upgrade) && $scope.requirementsMet(upgrade.requirement);
    };

    $scope.canBuyDevice = function (device) {
        var buyPrice = $scope.getDeviceDataCost(device);
        return $scope.data >= buyPrice && buyPrice > 0;
    };

    $scope.getDeviceBuyCount = function (device) {
        var i, price, count, lastAffordable;
        lastAffordable = 0;
        price = 0;
        count = $scope.buyMode;
        if (count === 0) {
            i = 0;
            while (price <= $scope.data) {
                lastAffordable = i;
                price += device.cpuCostBase * Math.pow(device.cpuCostIncrement, device.count + i);
                i += 1;
            }
            return lastAffordable;
        }
        return count;
    };

    $scope.getDeviceDataCost = function (device, count) {
        var i, price, lastAffordable;
        if (typeof count === 'undefined') {
            count = $scope.buyMode;
        }
        lastAffordable = 0;
        price = 0;
        if (count === 0) {
            i = 0;
            while (price <= $scope.data) {
                lastAffordable = price;
                price += device.cpuCostBase * Math.pow(device.cpuCostIncrement, device.count + i);
                i += 1;
            }
            price = lastAffordable;
        } else {
            for (i = 0; i < count; i += 1) {
                price += device.cpuCostBase * Math.pow(device.cpuCostIncrement, device.count + i);
            }
        }
        return Math.round(price * 100) / 100;
    };

    $scope.getPriceOfOne = function (device) {
        return $scope.getDeviceDataCost(device, 1);
    };

    //helps get the colors of the device buttons - determines first whether you can afford the item in the current purchasing mode.
    $scope.getCanBuyColor = function (purchaseType, obj) {
        switch (purchaseType) {
        case 'device':
            if ($scope.canBuyDevice(obj)) {
                return 'fg-green';
            }
            return 'fg-gray';
        case 'upgrade':
            if ($scope.canBuyUpgrade(obj)) {
                return 'fg-green';
            }
            return 'fg-gray';
        case 'science':
            if ($scope.canBuyScience(obj)) {
                return 'fg-green';
            }
            return 'fg-gray';
        default:
            return 'fg-gray';
        }
    };

    $scope.getNextBuyModeInCycle = function () {
        switch ($scope.buyMode) {
        case 1:
            return 10;
        case 10:
            return 100;
        case 100:
            return 0;
        case 0:
            return 1;
        default:
            return 1;
        }
    };

    $scope.cycleBuyMode = function () {
        $scope.buyMode = $scope.getNextBuyModeInCycle();
    };

    $scope.getDisplayBuyMode = function () {
        if ($scope.buyMode === 0) {
            return 'Max';
        } else {
            return 'x' + $scope.buyMode;
        }
    };

    $scope.riskDialRanges = [
        {
            min: 0,
            max: 10,
            color: '#00FF00'
        },
        {
            min: 11,
            max: 25,
            color: '#44DD00'
        },
        {
            min: 26,
            max: 50,
            color: '#88BB00'
        },
        {
            min: 51,
            max: 75,
            color: '#AA8800'
        },
        {
            min: 76,
            max: 100,
            color: '#FF0000'
        }
    ];

    $scope.riskDialUnit = '%';

    $scope.getRiskGauge = function (device) {
        var riskGaugeOptions = {
            value: 1,
            upperLimit: 100,
            lowerLimit: 0,
            unit: '%',
            precision: 1,
            ranges: [

            ]
        };
        return riskGaugeOptions;
    };

    $scope.truncate = function (number, digits) {
        var x;
        x = number * Math.pow(10, digits);
        x = Math[x < 0 ? 'ceil' : 'floor'](x);
        x /= Math.pow(10, digits);
        return x;
    };

    $scope.getStoragePercentage = function () {
        var storagePercentage;
        if ($scope.getDeviceStorageMax() > 0) {
            storagePercentage = $scope.data * 100 / $scope.getDeviceStorageMax();
        } else {
            storagePercentage = 0;
        }
        return storagePercentage;
    };

    $scope.getDigits = function (number) {
        var i = 0;
        while (number > 10) {
            i += 1;
            number /= 10;
        }
        return i;
    };

    $scope.shorten = function (number, precision, forceScientific) {
        forceScientific = (typeof forceScientific === 'undefined') ? false : forceScientific;
        var i = 0, suffix = '';
        while (number >= 1000) {
            i += 1;
            number /= 1000.0;
        }
        number = $scope.truncate(number, precision);
        if (forceScientific) {
            if (i === 0) {
                return number;
            }
            return number + 'e' + (i * 3);
        }
        switch (i) {
        case 1:
            return number + ' k';
        case 2:
            return number + ' m';
        case 3:
            return number + ' g';
        case 4:
            return number + ' t';
        case 5:
            return number + ' p';
        case 6:
            return number + ' e';
        case 7:
            return number + ' z';
        case 8:
            return number + ' y';
        case 0:
            return number;
        default:
            return number + 'e' + (i * 3);
        }
    };

    $scope.display = function (number, forceScientific) {
        forceScientific = (typeof forceScientific === 'undefined') ? false : forceScientific;
        return $scope.shorten(number, 2, forceScientific);
    };

    $scope.buyDevice = function (device) {
        if ($scope.data < $scope.getDeviceDataCost(device)) {
            return;
        }
        var count = $scope.getDeviceBuyCount(device);
        $scope.data -= $scope.getDeviceDataCost(device);
        $scope.hackDevice(device.id, count);
    };
}]);
