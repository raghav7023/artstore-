import { products } from '../data/products.data.js';

export const getProducts = (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, products });
};

export const getProductById = (req, res) => {
  const product = products.find((item) => item.id === Number(req.params.id));

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ success: true, product });
};
