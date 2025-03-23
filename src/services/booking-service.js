const axios = require("axios");
const { BookingRepository } = require("../repositories");
const db = require("../models");
const { ServerConfig } = require("../config");
const AppError = require("../utils/errors/app-error");
const { StatusCodes } = require("http-status-codes");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

const bookingRepository = new BookingRepository();
async function createBooking(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const flight = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
    );
    const flightData = flight.data.data;
    if (data.noofSeats > flightData.totalSeats) {
      throw new AppError("not enough seats available", StatusCodes.BAD_REQUEST);
    }
    const totalBillingAmount = data.noofSeats + flightData.price;
    const bookingPayload = { ...data, totalCost: totalBillingAmount };
    const booking = await this.bookingRepository.create(
      bookingPayload,
      transaction
    );
    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noofSeats,
      }
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function makePayment(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDeatils = await bookingRepository.get(
      data.bookingId,
      transaction
    );
    if (bookingDeatils.status == CANCELLED) {
      await bookingRepository.update(
        Date.bookingId,
        { status: CANCELLED },
        transaction
      );
      throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
    }
    const bookingTime = new Date(bookingDeatils.createdAt);
    const currentTime = new Date();
    if (currentTime - bookingTime > 300000) {
        await cancelBooking(data.bookingId);
      throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
    }
    if (bookingDeatils.totalCost != data.totalCost) {
      throw new AppError(
        "The amount amount doesnt match",
        StatusCodes.BAD_REQUEST
      );
    }
    if (bookingDeatils.userId != data.userId) {
      throw new AppError(
        "the user corresponding is does not match",
        StatusCodes.BAD_REQUEST
      );
    }
    // asssume here that payment is successfull
    await bookingRepository.update(
      data.bookingId,
      { status: BOOKED },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}

async function cancelBooking(bookingId) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDeatils = await bookingRepository.get(
      bookingId,
      transaction
    );
    if (bookingDeatils.status == CANCELLED) {
      transaction.commit();
      return true;
    }
    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDeatils.flightId}/seats`,
      {
        seats: bookingDeatils.noofSeats,
        dec: 0,
      }
    );
    await bookingRepository.update(
      bookingId,
      { status: CANCELLED },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}

async function cancelOldBookings(){
    try{
        const time = new Date(Date.now() - 1000*300);
        const response = await bookingRepository.cancelOldBookings(time);
        
        return response;
    }catch(error){
        console.log(error);
    }
}

module.exports = {
  createBooking,
  makePayment,
  cancelOldBookings
};
