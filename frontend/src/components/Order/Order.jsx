import React from 'react'

export default function Order() {
  return (
      <div className='order'>

          <h1>Place Your Order</h1>

          <form className='form'>

              <label>Name :</label>
              <br />
              <input
                  type='text'
                  placeholder='Enter your name'
              />
              <br /><br />

              <label>Phone Number :</label>
              <br />
              <input
                  type='number'
                  placeholder='Enter phone number'
              />
              <br /><br />

              <label>Address :</label>
              <br />
              <textarea
                  placeholder='Enter your address'
              ></textarea>
              <br /><br />

              <label>Payment Method :</label>
              <br />

              <input type='radio' name='payment' />
              <label>Cash on Delivery</label>

              <br />

              <input type='radio' name='payment' />
              <label>UPI</label>

              <br />

              <input type='radio' name='payment' />
              <label>Card</label>

              <br /><br />

              <h3>Order Summary</h3>

              <p>Painting Price : ₹1200</p>
              <p>Delivery Charge : ₹100</p>
              <p>Total : ₹1300</p>

              <button>
                  Place Order
              </button>

          </form>

      </div>
  )
}
