/* eslint-disable no-unused-vars */
var redis = require('redis');
var Redlock = require('redlock');

exports.RedisLock = class RedisLock {
  constructor(options) {
    this.options = options || {};

    // create redis clients
    this.redisClient = redis.createClient(6379, 'Redis', { password: 'yann2902' });
    // Note: We need another client to handle redis keyspace events because Redlock seems to doesn't work with client subscribes...
    this.redisClientListenner = redis.createClient(6379, 'Redis', { password: 'yann2902' });
    this.redisClientUpdater = redis.createClient(6379, 'Redis', { password: 'yann2902' });

    this.redisClientListenner.config('SET', 'notify-keyspace-events', 'Ex'); // config Redis to publish expired events for data

    var self = this
    this.redisClientListenner.on('message', (channel, expiredKey) => {
      // we have to find the user locks list that contain the expired key
      var scanResult = self.redisClientUpdater.scan("0", "match", "locks:*", function (err, results) { // list all redis keys that begin with "locks:"
        /** if we have error, throw exception 
         * TODO: Make more readable & usable exception message
         * */
        if (err !== null) { throw new Error(err) }
        var redisLockLists = results[1];

        /** Remove expired key from all existing redis "users locks" sets */
        for (var i = 0; i < redisLockLists.length; i++) {
          let userLocksList = redisLockLists[i]
          self.redisClientUpdater.srem(userLocksList, expiredKey);
        }
      });
    });
    this.redisClientListenner.subscribe('__keyevent@0__:expired');



    // redlock nodeJS implementation
    var redlock = new Redlock(
      // you should have one client for each independent redis node
      // or cluster
      [this.redisClient],
      {
        // the expected clock drift; for more details
        // see http://redis.io/topics/distlock
        driftFactor: 0.01, // multiplied by lock ttl to determine drift time

        // the max number of times Redlock will attempt
        // to lock a resource before erroring
        retryCount: 10,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200 // time in ms
      }
    );

    this.redlock = redlock
  }

  async find(params) {
    return [];
  }


  /**
   * Get a ressource lock
   * 
   * @param {*} id
   * @param {*} params 
   */
  async get(id, params) {
    return id;
  }


  /**
   * Create a new ressource lock
   * 
   * @param {*} data Object, property "ressource" is the name of the ressource to unlock
   * @param {*} params 
   */
  async create(data, params) {
    let ressourceData;
    // cannot lock several ressources a time : ONLY take first array item !!!
    Array.isArray(data) ? ressourceData = data[0] : ressourceData = data;

    return this.redlock.lock(ressourceData.ressource, 3600000)
      .then((unlock) => {
        // now we can store lock infos
        const listKeyName = 'locks:' + params.user._id;
        this.redisClient.sadd(listKeyName, ressourceData.ressource);
        // set unlock.value to a new key in Redis
        return ressourceData;
      })
      .catch((err) => {
        /** Unable to acquire the lock : check current user already own the lock */
        var userLockSetName = "locks:" + params.user._id
        return new Promise((resolve, reject) => {
          this.redisClientUpdater.sismember(userLockSetName, ressourceData.ressource, (readLockErr, result) => {
            if (result === 1) {
              resolve(ressourceData);
            } else {
              reject(err);
            }
          });
        });
      });
  }

  async update(id, data, params) {
    return data;
  }

  async patch(id, data, params) {
    return data;
  }


  /**
   * Unlock a ressource
   * The ressource SHOULD be owned by user. If not, throws an error
   * 
   * @param {*} id The name of the ressource to unlock
   * @param {*} params
   */
  async remove(id, params) {
    return { id };
  }
};
