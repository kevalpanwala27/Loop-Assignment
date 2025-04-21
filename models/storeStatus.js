module.exports = (sequelize, DataTypes) => {
  const StoreStatus = sequelize.define(
    "StoreStatus",
    {
      store_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp_utc: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["active", "inactive"]],
        },
      },
    },
    {
      timestamps: false,
      indexes: [{ fields: ["store_id"] }, { fields: ["timestamp_utc"] }],
    }
  );

  return StoreStatus;
};
