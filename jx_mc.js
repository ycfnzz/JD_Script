/**
*
    Name: 京喜牧场
    Address: 京喜App -> 我的 -> 全民赚大钱
    Author: MoPoQAQ
    Created：2021/6/4 23:30
    Updated: 2021/6/6 10:30
    
    ！！！先将新手任务做完，再执行本脚本，不然会出现未知错误

    hostname = m.jingxi.com

    BoxJS订阅
    https://raw.githubusercontent.com/whyour/hundun/master/quanx/whyour.boxjs.json
*
**/

const $ = new Env("京喜牧场");
const JD_API_HOST = "https://m.jingxi.com";
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
$.showLog = $.getdata("mc_showLog") ? $.getdata("mc_showLog") === "true" : false;
$.result = [];
$.cookieArr = [];
$.currentCookie = '';
$.petid = [];
$.allTask = [];

!(async () => {
    if (!getCookies()) return;
    for (let i = 0; i < $.cookieArr.length; i++) {
        $.currentCookie = $.cookieArr[i];

        if ($.currentCookie) {
            $.userName = decodeURIComponent($.currentCookie.match(/pt_pin=(.+?);/) && $.currentCookie.match(/pt_pin=(.+?);/)[1]);
            $.index = i + 1;
            $.log(`\n开始【京东账号${i + 1}】${$.userName}`);

            const homepageinfo = await GetHomePageInfo();

            // 领取金币
            //await $.wait(500);
            //await GetCoin();

            // 获取成就任务列表
            await $.wait(500);
            await GetUserTaskStatusList(1);
            await $.wait(500);
            await Award();

            // 获取每日任务列表（待完成）
            await $.wait(500);
            await GetUserTaskStatusList(3);
            await $.wait(500);
            await DoTask();

            // 获取每日任务列表（待领取）
            await $.wait(500);
            await GetUserTaskStatusList(2);
            await $.wait(500);
            await Award();

            // 购物
            await $.wait(500);
            await UseCoin(homepageinfo)

            // 领金蛋
            await $.wait(500);
            await GetSelfResult(homepageinfo);

            // 喂食
            await $.wait(500);
            await Feed(homepageinfo);
        }
    }
    await $.wait(500);
    await showMsg();
})().catch((e) => $.logErr(e))
    .finally(() => $.done());

// 获取主要信息
function GetHomePageInfo() {
    return new Promise(async (resolve) => {
        $.get(taskUrl(`queryservice/GetHomePageInfo`, ``), async (err, resp, _data) => {
            try {
                // 格式化JSON数据
                _data = _data.replace("jsonpCBKJJJ(", "");
                _data = _data.substring(0, _data.length - 1);
                //$.log(_data);
                const {
                    data: {
                        cockinfo = {},      // 孵化小鸡信息
                        coins,      // 金币数量
                        // cow: {
                        //     currstage,      // 当前等级
                        //     nextstagecoin,      // 距离下一级金币数量
                        //     perlimit,       // 最大容量
                        //     speed,      // 金币产出速度 默认10秒1个
                        //     totalcoin       // 以产出金币数量
                        // } = {},     // 牛牛信息
                        cow = {},
                        eggcnt,     // 当前可用金蛋数量
                        hatchboxinfo,   // 孵化箱信息
                        materialinfo = [],      // 原材料信息，1: 白菜
                        nickname,       // 用户昵称
                        petinfo = [],       // 小鸡信息
                    },
                    message,
                    ret
                } = JSON.parse(_data);
                $.log(`\n【获取用户信息📝】：${message}\n${$.showLog ? _data : ""}`);

                // 小鸡id编号列表
                $.petid = petinfo.filter(x => x.status == 1).map(x => x.petid);
                //$.log($.petid);
                resolve({
                    cockinfo,
                    coins,
                    cow,
                    eggcnt,
                    hatchboxinfo,
                    materialinfo,
                    nickname,
                    petinfo,
                });
            }
            catch (e) {
                $.logErr(e, resp);
            }
            finally {
                resolve();
            }
        });
    });
}

// 获取每日任务和成就任务列表
function GetUserTaskStatusList(taskType) {
    return new Promise(async (resolve) => {
        switch (taskType) {
            case 1:     // 成就任务
                $.get(taskListUrl(`GetUserTaskStatusList`, `dateType=${taskType}`), async (err, resp, _data) => {
                    try {
                        //$.log(_data);
                        const {
                            data: {
                                userTaskStatusList = []
                            } = {},
                            msg,
                            ret
                        } = JSON.parse(_data);
                        $.allTask = userTaskStatusList.filter(x => x.awardStatus === 2 && x.completedTimes === x.targetTimes);
                        $.log(`\n获取【🎖 成就任务】列表 ${msg}，总共${$.allTask.length}个任务！\n${$.showLog ? data : ""}`);
                    } catch (e) {
                        $.logErr(e, resp);
                    } finally {
                        resolve();
                    }
                });
                break;
            case 2:     // 每日任务(领取奖励)
                $.get(taskListUrl(`GetUserTaskStatusList`, `dateType=${taskType}`), async (err, resp, _data) => {
                    try {
                        //$.log(_data);
                        const {
                            data: {
                                userTaskStatusList = []
                            } = {},
                            msg,
                            ret } = JSON.parse(_data);
                        $.allTask = userTaskStatusList.filter(x => x.awardStatus === 2 && x.completedTimes === x.targetTimes);
                        $.log(`\n获取【📆 每日任务(待领取奖励)】列表 ${msg}，总共${$.allTask.length}个任务！\n${$.showLog ? data : ""}`);
                    } catch (e) {
                        $.logErr(e, resp);
                    } finally {
                        resolve();
                    }
                });
                break;
            case 3:     // 每日任务(做任务)
                $.get(taskListUrl(`GetUserTaskStatusList`, `dateType=2`), async (err, resp, _data) => {
                    try {
                        //$.log(_data);
                        const {
                            data: {
                                userTaskStatusList = []
                            } = {},
                            msg,
                            ret } = JSON.parse(_data);
                        $.allTask = userTaskStatusList.filter(x => x.awardStatus === 2 && x.taskCaller === 1 && x.completedTimes != x.targetTimes);
                        $.log(`\n获取【📆 每日任务(待完成)】列表 ${msg}，总共${$.allTask.length}个任务！\n${$.showLog ? data : ""}`);
                    } catch (e) {
                        $.logErr(e, resp);
                    } finally {
                        resolve();
                    }
                });
                break;
            default:
                break;
        }
    });
}

// 完成每日任务
function DoTask() {
    return new Promise(async (resolve) => {
        if ($.allTask.length > 0) {
            for (let i = 0; i < $.allTask.length; i++) {
                const { description, taskId } = $.allTask[i];
                $.get(taskListUrl(`DoTask`, `taskId=${taskId}&configExtra=&_stk=bizCode%2CconfigExtra%2Csource%2CtaskId`), async (err, resp, _data) => {
                    try {
                        const {
                            data,
                            msg,
                            ret
                        } = JSON.parse(_data);
                        //$.log(_data);
                        if (ret === 0)
                            $.log(`\n【${description}🗒️】 任务 完成`);
                        else
                            $.log(`\n【${description}🗒️】 任务 未完成, 可能您的账号是黑号,目前原因尚不明确!!!`);

                    } catch (e) {
                        $.logErr(e, resp);
                    } finally {
                        resolve();
                    }
                });
            }
        }
        else {
            resolve();
        }
    });
}

// 领取日常任务和成就任务奖励
function Award() {
    return new Promise(async (resolve) => {
        if ($.allTask.length > 0) {
            for (let i = 0; i < $.allTask.length; i++) {
                const { description, reward, taskId } = $.allTask[i];
                $.get(taskListUrl(`Award`, `taskId=${taskId}`), async (err, resp, _data) => {
                    try {
                        const {
                            data,
                            msg,
                            ret
                        } = JSON.parse(_data);

                        if (ret === 0)
                            $.log(`\n【${description}💰】 任务奖励领取成功, 获得 ¥ ${reward}`);
                        else
                            $.log(`\n【${description}💰】 任务奖励领取失败 ${msg}`);

                    } catch (e) {
                        $.logErr(e, resp);
                    } finally {
                        resolve();
                    }
                });
            }
        }
        else {
            resolve();
        }
    });
}

// 586c8965bad67d1f17711c8523d6bc94
// f9e7ce2b8d7f064c57b5227349d9b929
// 收取金币
function GetCoin() {
    return new Promise(async (resolve) => {
        const currtime = Math.round(new Date() / 1000).toString();
        const token = new MD5().MD5.createMD5String(currtime);
        $.log(currtime, token);
        $.get(taskUrl(`operservice/GetCoin`, `token=${token}&_stk=channel%2Csceneid%2Ctoken`), async (err, resp, _data) => {
            try {
                // 格式化JSON数据
                //_data = _data.replace("jsonpCBKQQ(", "");
                //_data = _data.substring(0, _data.length - 1);
                const {
                    data: {
                        addcoin,     // 收获金币数量
                    } = {},
                    message,
                    ret
                } = JSON.parse(_data);
                $.log(_data);
                $.log(`【收取金币💰】 ${ret == 0 ? message + `共 ${addcoin} 个` : message} \n ${$.showMsg ? _data : ""} `);
            }
            catch (e) {
                $.logErr(e, resp);
            }
            finally {
                resolve();
            }
        });
    });
}

// 喂食
function Feed(homepageinfo) {
    return new Promise(async (resolve) => {
        try {
            const { materialinfo } = homepageinfo;
            //$.log(materialinfo);
            const info = materialinfo.filter(x => x.type === 1);
            const { value } = info[0];
            //$.log(value);
            if (value >= 10) {
                $.get(taskUrl(`operservice/Feed`, `_stk=channel%2Csceneid`), async (err, resp, _data) => {
                    try {
                        // 格式化JSON数据
                        //_data = _data.replace("jsonpCBKQQ(", "");
                        //_data = _data.substring(0, _data.length - 1);
                        const {
                            data,
                            message,
                            ret
                        } = JSON.parse(_data);
                        //$.log(_data);
                        $.log(`【投喂🥬】${message} \n ${$.showMsg ? _data : ""} `);
                    }
                    catch (e) {
                        $.logErr(e, resp);
                    }
                    finally {
                        resolve();
                    }
                });
            }
            else {
                $.log("白菜不足，满10颗可喂养哦");
                resolve();
            }
        }
        catch (e) {
            $.log(e);
        }
        finally {
            resolve();
        }

    });
}

// 金币
// 买白菜 > 孵化小鸡
function UseCoin(homepageinfo) {
    return new Promise(async (resolve) => {
        const { coins } = homepageinfo;
        const CurrCoin = coins / 5000;
        //$.log(CurrCoin);
        if (CurrCoin >= 2) {
            await Buy();
            resolve();
        }
        else if (CurrCoin >= 1) {
            await Buy();
            resolve();
        }
        else {
            $.log("您的金币太少了，什么也不能买，赶快去打工赚金币吧～");
            resolve();
        }
    });
}

// 购买白菜🥬
function Buy() {
    return new Promise(async (resolve) => {
        $.get(taskUrl(`operservice/Buy`, `type=1&_stk=channel%2Csceneid%2Ctype`), async (err, resp, _data) => {
            try {
                const {
                    data: {
                        newnum,
                        usecoins,
                    } = {},
                    message,
                    ret
                } = JSON.parse(_data);
                $.log(_data);
                $.log(`【购物🛒】 ${ret === 0 ? `${message}，您消费了 ¥${usecoins}金币，当前您有${newnum}颗白菜🥬 ，快去喂小鸡崽子～` : message} \n ${$.showMsg ? _data : ""} `);
            }
            catch (e) {
                $.logErr(e, resp);
            }
            finally {
                resolve();
            }
        });
    });
}

// /jxmc/operservice/GetSelfResult?
// channel=7&sceneid=1001&type=11&itemid=pet_9778ca179e4b6d46feeb27bdc0782642
// &_stk=channel%2Citemid%2Csceneid%2Ctype&_ste=1
// &_=1622942662835&sceneval=2&g_login_type=1&callback=jsonpCBKN&g_ty=ls
// 领金蛋
function GetSelfResult(homepageinfo) {
    return new Promise(async (resolve) => {
        const { petinfo } = homepageinfo;
        const info = petinfo.filter(x => x.progress === "0" && x.experience == x.lastborn);
        if (info.length > 0) {
            const { petid } = info[0];
            $.get(taskUrl(`operservice/GetSelfResult`, `type=11&itemid=${petinfo}&_stk=channel%2Citemid%2Csceneid%2Ctype`), async (err, resp, _data) => {
                try {
                    const {
                        data :{
                            addnum,
                            newnum,
                        } ={},
                        message,
                        ret,
                    } = JSON.parse(_data);
                    $.log(_data);
                    $.log(`【领取金蛋🥚】 ${ret === 0 ? `${message}，收获${addnum}个金蛋🥚，当前您拥有${newnum}个金蛋🥚，请加大力度～` : message} \n ${$.showMsg ? _data : ""} `);
                }
                catch (e) {
                    $.logErr(e, resp);
                }
                finally {
                    resolve();
                }
            });
        }
        else {
            resolve();
        }
    });
}

function getCookies() {
    if ($.isNode()) {
        $.cookieArr = Object.values(jdCookieNode);
    } else {
        const CookiesJd = JSON.parse($.getdata("CookiesJD") || "[]").filter(x => !!x).map(x => x.cookie);
        $.cookieArr = [$.getdata("CookieJD") || "", $.getdata("CookieJD2") || "", ...CookiesJd];
    }
    if (!$.cookieArr[0]) {
        $.msg(
            $.name,
            "【⏰提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取",
            "https://bean.m.jd.com/",
            { "open-url": "https://bean.m.jd.com/", }
        );
        return false;
    }
    return true;
}

function taskUrl(function_path, body) {
    return {
        //url: `${JD_API_HOST}/jxmc/${function_path}?channel=7&sceneid=1001&${body}&_ste=1&_=${Date.now()}&sceneval=2&g_login_type=1&callback=${callback}&g_ty=ls`,
        url: `${JD_API_HOST}/jxmc/${function_path}?channel=7&sceneid=1001&${body}&_ste=1&_=${Date.now()}&sceneval=2&g_login_type=1&g_ty=ls`,
        headers: {
            Cookie: $.currentCookie,
            Accept: "*/*",
            Connection: "keep-alive",
            Referer: "https://st.jingxi.com/pingou/jxmc/index.html?nativeConfig=%7B%22immersion%22%3A1%2C%22toColor%22%3A%22%23e62e0f%22%7D&;__mcwvt=sjcp&ptag=7155.9.95",
            "Accept-Encoding": "gzip, deflate, br",
            Host: "m.jingxi.com",
            "User-Agent": `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/wifi;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/${Math.random * 98 + 1};pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
            "Accept-Language": "zh-cn",
        },
    };
}

function taskListUrl(function_path, body) {
    return {
        url: `${JD_API_HOST}/newtasksys/newtasksys_front/${function_path}?_=${Date.now()}&source=jxmc&bizCode=jxmc&${body}&_ste=1&sceneval=2&g_login_type=1&g_ty=ajax`,
        headers: {
            Cookie: $.currentCookie,
            Accept: "application/json",
            Connection: "keep-alive",
            Referer: "https://st.jingxi.com/pingou/jxmc/index.html?nativeConfig=%7B%22immersion%22%3A1%2C%22toColor%22%3A%22%23e62e0f%22%7D&;__mcwvt=sjcp&ptag=7155.9.95",
            "Accept-Encoding": "gzip, deflate, br",
            Host: "m.jingxi.com",
            "User-Agent": `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/wifi;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/${Math.random * 98 + 1};pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
            "Accept-Language": "zh-cn",
        },
    };
}

function showMsg() {
    return new Promise(async (resolve) => {
        if ($.notifyTime) {
            const notifyTimes = $.notifyTime.split(",").map((x) => x.split(":"));
            const now = $.time("HH:mm").split(":");
            $.log(`\n${JSON.stringify(notifyTimes)}`);
            $.log(`\n${JSON.stringify(now)}`);
            if (notifyTimes.some((x) => x[0] === now[0] && (!x[1] || x[1] === now[1]))) {
                $.msg($.name, "", `\n${$.result.join("\n")}`);
            }
        } else {
            $.msg($.name, "", `\n${$.result.join("\n")}`);
        }

        if ($.isNode() && process.env.CFD_NOTIFY_CONTROL === 'true')
            await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `账号${$.index}：${$.nickName || $.userName}\n${$.result.join("\n")}`);

        resolve();
    });
}


// prettier-ignore
function Env(t, e) {
    class s {
        constructor(t) {
            this.env = t
        }
        send(t, e = "GET") {
            t = "string" == typeof t ? {
                url: t
            } : t;
            let s = this.get;
            return "POST" === e && (s = this.post), new Promise((e, i) => {
                s.call(this, t, (t, s, r) => {
                    t ? i(t) : e(s)
                })
            })
        }
        get(t) {
            return this.send.call(this.env, t)
        }
        post(t) {
            return this.send.call(this.env, t, "POST")
        }
    }
    return new class {
        constructor(t, e) {
            this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date)
                .getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`)
        }
        isNode() {
            return "undefined" != typeof module && !!module.exports
        }
        isQuanX() {
            return "undefined" != typeof $task
        }
        isSurge() {
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }
        isLoon() {
            return "undefined" != typeof $loon
        }
        toObj(t, e = null) {
            try {
                return JSON.parse(t)
            } catch {
                return e
            }
        }
        toStr(t, e = null) {
            try {
                return JSON.stringify(t)
            } catch {
                return e
            }
        }
        getjson(t, e) {
            let s = e;
            const i = this.getdata(t);
            if (i) try {
                s = JSON.parse(this.getdata(t))
            } catch { }
            return s
        }
        setjson(t, e) {
            try {
                return this.setdata(JSON.stringify(t), e)
            } catch {
                return !1
            }
        }
        getScript(t) {
            return new Promise(e => {
                this.get({
                    url: t
                }, (t, s, i) => e(i))
            })
        }
        runScript(t, e) {
            return new Promise(s => {
                let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                i = i ? i.replace(/\n/g, "")
                    .trim() : i;
                let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
                r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
                const [o, h] = i.split("@"), a = {
                    url: `http://${h}/v1/scripting/evaluate`,
                    body: {
                        script_text: t,
                        mock_type: "cron",
                        timeout: r
                    },
                    headers: {
                        "X-Key": o,
                        Accept: "*/*"
                    }
                };
                this.post(a, (t, e, i) => s(i))
            })
                .catch(t => this.logErr(t))
        }
        loaddata() {
            if (!this.isNode()) return {}; {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e);
                if (!s && !i) return {}; {
                    const i = s ? t : e;
                    try {
                        return JSON.parse(this.fs.readFileSync(i))
                    } catch (t) {
                        return {}
                    }
                }
            }
        }
        writedata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e),
                    r = JSON.stringify(this.data);
                s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
            }
        }
        lodash_get(t, e, s) {
            const i = e.replace(/\[(\d+)\]/g, ".$1")
                .split(".");
            let r = t;
            for (const t of i)
                if (r = Object(r)[t], void 0 === r) return s;
            return r
        }
        lodash_set(t, e, s) {
            return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString()
                .match(/[^.[\]]+/g) || []), e.slice(0, -1)
                    .reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
        }
        getdata(t) {
            let e = this.getval(t);
            if (/^@/.test(t)) {
                const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
                if (r) try {
                    const t = JSON.parse(r);
                    e = t ? this.lodash_get(t, i, "") : e
                } catch (t) {
                    e = ""
                }
            }
            return e
        }
        setdata(t, e) {
            let s = !1;
            if (/^@/.test(e)) {
                const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}";
                try {
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
                } catch (e) {
                    const o = {};
                    this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
                }
            } else s = this.setval(t, e);
            return s
        }
        getval(t) {
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }
        setval(t, e) {
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }
        initGotEnv(t) {
            this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
        }
        get(t, e = (() => { })) {
            t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.get(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t)
                .then(t => {
                    const {
                        statusCode: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    } = t;
                    e(null, {
                        status: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    }, o)
                }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t)
                    .on("redirect", (t, e) => {
                        try {
                            if (t.headers["set-cookie"]) {
                                const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse)
                                    .toString();
                                s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                            }
                        } catch (t) {
                            this.logErr(t)
                        }
                    })
                    .then(t => {
                        const {
                            statusCode: s,
                            statusCode: i,
                            headers: r,
                            body: o
                        } = t;
                        e(null, {
                            status: s,
                            statusCode: i,
                            headers: r,
                            body: o
                        }, o)
                    }, t => {
                        const {
                            message: s,
                            response: i
                        } = t;
                        e(s, i, i && i.body)
                    }))
        }
        post(t, e = (() => { })) {
            if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.post(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            });
            else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t)
                .then(t => {
                    const {
                        statusCode: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    } = t;
                    e(null, {
                        status: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    }, o)
                }, t => e(t));
            else if (this.isNode()) {
                this.initGotEnv(t);
                const {
                    url: s,
                    ...i
                } = t;
                this.got.post(s, i)
                    .then(t => {
                        const {
                            statusCode: s,
                            statusCode: i,
                            headers: r,
                            body: o
                        } = t;
                        e(null, {
                            status: s,
                            statusCode: i,
                            headers: r,
                            body: o
                        }, o)
                    }, t => {
                        const {
                            message: s,
                            response: i
                        } = t;
                        e(s, i, i && i.body)
                    })
            }
        }
        time(t) {
            let e = {
                "M+": (new Date)
                    .getMonth() + 1,
                "d+": (new Date)
                    .getDate(),
                "H+": (new Date)
                    .getHours(),
                "m+": (new Date)
                    .getMinutes(),
                "s+": (new Date)
                    .getSeconds(),
                "q+": Math.floor(((new Date)
                    .getMonth() + 3) / 3),
                S: (new Date)
                    .getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date)
                .getFullYear() + "")
                .substr(4 - RegExp.$1.length)));
            for (let s in e) new RegExp("(" + s + ")")
                .test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s])
                    .substr(("" + e[s])
                        .length)));
            return t
        }
        msg(e = t, s = "", i = "", r) {
            const o = t => {
                if (!t) return t;
                if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? {
                    "open-url": t
                } : this.isSurge() ? {
                    url: t
                } : void 0;
                if ("object" == typeof t) {
                    if (this.isLoon()) {
                        let e = t.openUrl || t.url || t["open-url"],
                            s = t.mediaUrl || t["media-url"];
                        return {
                            openUrl: e,
                            mediaUrl: s
                        }
                    }
                    if (this.isQuanX()) {
                        let e = t["open-url"] || t.url || t.openUrl,
                            s = t["media-url"] || t.mediaUrl;
                        return {
                            "open-url": e,
                            "media-url": s
                        }
                    }
                    if (this.isSurge()) {
                        let e = t.url || t.openUrl || t["open-url"];
                        return {
                            url: e
                        }
                    }
                }
            };
            if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) {
                let t = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];
                t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t)
            }
        }
        log(...t) {
            t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
        }
        logErr(t, e) {
            const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t)
        }
        wait(t) {
            return new Promise(e => setTimeout(e, t))
        }
        done(t = {}) {
            const e = (new Date)
                .getTime(),
                s = (e - this.startTime) / 1e3;
            this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
        }
    }(t, e)
}

function MD5() {
    //创建并实例化MD5对象并让他可以调用自身方法
    function MD5(string) {
        this._this = this;
        return this;
    }
    this.MD5 = new MD5;
    MD5.prototype.createMD5String = function (string) {
        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        string = uTF8Encode(string);
        x = convertToWordArray(string);
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
        for (k = 0; k < x.length; k += 16) {
            AA = a; BB = b; CC = c; DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD);
        }
        var tempValue = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
        return tempValue.toLowerCase();
    }
    var rotateLeft = function (lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    var addUnsigned = function (lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }
    var F = function (x, y, z) {
        return (x & y) | ((~x) & z);
    }
    var G = function (x, y, z) {
        return (x & z) | (y & (~z));
    }
    var H = function (x, y, z) {
        return (x ^ y ^ z);
    }
    var I = function (x, y, z) {
        return (y ^ (x | (~z)));
    }
    var FF = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    var GG = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    var HH = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    var II = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    var convertToWordArray = function (string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWordsTempOne = lMessageLength + 8;
        var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
        var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };
    var wordToHex = function (lValue) {
        var WordToHexValue = "", WordToHexValueTemp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValueTemp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
        }
        return WordToHexValue;
    };
    var uTF8Encode = function (string) {
        string = string.toString().replace(/\x0d\x0a/g, "\x0a");
        var output = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                output += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                output += String.fromCharCode((c >> 6) | 192);
                output += String.fromCharCode((c & 63) | 128);
            } else {
                output += String.fromCharCode((c >> 12) | 224);
                output += String.fromCharCode(((c >> 6) & 63) | 128);
                output += String.fromCharCode((c & 63) | 128);
            }
        }
        return output;
    };
}