const Tedious = require('tedious');
const Promise = require('bluebird');
const { db_user, db_password, db_server, db_name } = require('./config.json');

module.exports = {
	msSqlConnector: function() {
		const config =
			{
				userName: db_user,
				password: db_password,
				server: db_server,
				options:
					{
						database: db_name,
						encrypt: true,
						rowCollectionOnRequestDone: true,
					},
			};
		const currentConnect = this;
		currentConnect.config = config;
		currentConnect.errorHandler;
		currentConnect.connectedHandler;
		currentConnect.connection;

		currentConnect.onConnected = function(callback) {
			currentConnect.connectedHandler = callback;
			return currentConnect;
		};

		currentConnect.onError = function(callback) {
			currentConnect.errorHandler = callback;
			return currentConnect;
		};

		currentConnect.Request = function(sql) {
			const currentRequest = this;
			currentRequest.sql = sql;
			currentRequest.params = [];
			currentRequest.result = [];

			currentRequest.errorHandler;
			currentRequest.onCompleteHandler;

			currentRequest.addParam = function(key, type, value) {
				currentRequest.params.push({ key: key, type: type, value: value });
				return currentRequest;
			};

			currentRequest.Run = function() {
				const request = new Tedious.Request(currentRequest.sql, function(err, rowCount, rows) {
					if (err) {
						currentRequest.errorHandler(err);
					}
					else {
						currentRequest.onCompleteHandler(rowCount, currentRequest.result);
					}
				});

				request.on('row', function(columns) {
					const item = {};
					columns.forEach(function(column) {

						item[column.metadata.colName] = column.value;
					});
					currentRequest.result.push(item);
				});

				for (const i in currentRequest.params) {
					const item = currentRequest.params[i];
					request.addParameter(item.key, item.type, item.value);
				}

				currentConnect.connection.execSql(request);
				return currentRequest;
			};

			currentRequest.onError = function(callback) {
				currentRequest.errorHandler = callback;
				return currentRequest;
			};

			currentRequest.onComplete = function(callback) {
				currentRequest.onCompleteHandler = callback;

				return currentRequest;
			};
		};

		currentConnect.connect = function() {
			const connection = new Tedious.Connection(config);
			currentConnect.connection = connection;
			return Promise.promisify(connection.on.bind(connection))('connect');
		};

		currentConnect.close = function() {
			return currentConnect.connection.close();
		};
	},
};