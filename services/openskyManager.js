const mysql2 = require("mysql2/promise");

let _dbConnection;
const getDbConnection = () => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!_dbConnection || _dbConnection?.connection?._closing) {
        _dbConnection = await mysql2.createConnection(process.env.DATABASE_URL);
        console.log("DATABASE SUCCESSFULLY CONNECTED");
      }
      resolve(_dbConnection);
    } catch (exception) {
      console.log("ERROR: UNABLE TO CONNECT TO DATABASE");
      reject(exception);
    }
  });
};

const readActiveAccountFromDb = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getDbConnection();
      const [rows, fields] = await connection.query(
        "SELECT account_name FROM active_account LIMIT 1"
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        reject(
          "ERROR: QUERY EXPECTED ARRAY BUT WAS NOT ARRAY OR WAS EMPTY ARRAY"
        );
      } else {
        resolve(rows[0].account_name);
      }
    } catch (err) {
      console.log("ERROR: UNABLE TO QUERY DATABASE");
      reject(err);
    }
  });
};

const updateActiveAccountInDb = (newActiveAccount) => {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await getDbConnection();
      const [result] = await connection.query(
        `UPDAT active_account SET account_name = '${newActiveAccount}';`
      );
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  getActiveCredentials: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const activeAccount = await readActiveAccountFromDb();
        resolve(JSON.parse(process.env[`OPENSKY_${activeAccount}`]));
      } catch (err) {
        reject(err);
      }
    });
  },
  switchToNextAccount: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const activeAccount = await readActiveAccountFromDb();
        let newActiveAccount;

        switch (activeAccount) {
          case "ACCOUNT1": {
            newActiveAccount = "ACCOUNT2";
            break;
          }
          case "ACCOUNT2": {
            newActiveAccount = "ACCOUNT3";
            break;
          }
          case "ACCOUNT3": {
            newActiveAccount = "ACCOUNT4";
            break;
          }
          case "ACCOUNT4": {
            newActiveAccount = "ACCOUNT5";
            break;
          }
          case "ACCOUNT5": {
            newActiveAccount = "ACCOUNT1";
            break;
          }
        }

        await updateActiveAccountInDb(newActiveAccount);
        console.log(`OPENSKY ACTIVE ACCOUNT CHANGED TO ${newActiveAccount}`);
        resolve()
      } catch (err) {
        reject(err)
      }
    });
  },
};
