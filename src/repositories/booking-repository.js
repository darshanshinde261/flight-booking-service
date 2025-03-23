const {StatusCodes} = require('http-status-codes');
const {Op} = require('sequelize')
const {Booking} = require('../models');
const CrudRepository = require('./crud-repository');
const AppError = require('../utils/errors/app-error');
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

class BookingRepository extends CrudRepository{
    constructor(){
        super(Booking)
    }

    async createBooking(data, transaction){
        const response = await Booking.create(data,{transaction:transaction});
        return response;
    }
    async get(data,transaction){
        const response = await Booking.modelfindByPk(data,{transaction:transaction});
        if(!response){
            throw new AppError('Not able to found the resourse',StatusCodes.NOT_FOUND)
        }
        return response;
    }
    async update(id,data,transaction){ //data should be object
        const response = await Booking.update(data,{
            where:{
                id:id
            }
        },{transaction:transaction});
        if(!response){
            throw new AppError('There no such plane to update',StatusCodes.NOT_FOUND)
        }
        return response;
    } 

    async cancelOldBookings(timestamp){
        const response = await Booking.update(
            {status:CANCELLED},
            {
            where:{
                [Op.and]:[
                {
                    createdAt:{
                    [Op.lt]:timestamp
                }},{
                    status:{
                        [Op.ne]:BOOKED
                    }
                },
                {
                    status:{
                        [Op.ne]:CANCELLED
                    }
                }
             ]
            }
        });
        return response;
    }
}

module.exports = BookingRepository