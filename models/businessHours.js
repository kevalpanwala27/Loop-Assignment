module.exports = (sequelize, DataTypes) => {
  const BusinessHours = sequelize.define(
    "BusinessHours",
    {
      store_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 6,
        },
      },
      start_time_local: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_time_local: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      indexes: [{ fields: ["store_id"] }, { fields: ["day_of_week"] }],
    }
  );

  return BusinessHours;
};
