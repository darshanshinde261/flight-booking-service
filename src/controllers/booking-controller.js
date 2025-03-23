const { bookingServices } = require("../services");
const { SuccessResponse, ErrorResponse } = require("../utils/common");
const { StatusCodes } = require("http-status-codes");
const inMemDb = {};

async function createBooking(req, res) {
  try {
    const response = await bookingServices.createBooking({
      flightId: req.body.flightId,
      userId: req.body.userId,
      noofSeats: req.body.noofSeats,
    });
    SuccessResponse.data = response;
    return res.status(StatusCodes.CREATED).json(SuccessResponse);
  } catch (error) {
    ErrorResponse.error = error;
    return res.status(StatusCodes.BAD_REQUEST).json(ErrorResponse);
  }
}
async function makePayment(req, res) {
  try {
    const idempotencyKey = req.headers("x-idempotency");
    if(!idempotencyKey){
        return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "idempotency key missing" });
    }
    if (inMemDb[idempotencyKey]) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Cannot retry the successful payment" });
    }
    const response = await bookingServices.makePayment({
      userId: req.body.userId,
      totalCost: req.body.totalCost,
      bookingId: req.body.bookingId,
    });
    inMemDb[idempotencyKey] = idempotencyKey
    SuccessResponse.data = response;
    return res.status(StatusCodes.CREATED).json(SuccessResponse);
  } catch (error) {
    ErrorResponse.error = error;
    return res.status(StatusCodes.BAD_REQUEST).json(ErrorResponse);
  }
}

module.exports = {
  createBooking,
  makePayment,
};
