const Tedious = require('tedious');
const Promise = require('bluebird');

module.exports = {
	msSqlConnector: function(config) {
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