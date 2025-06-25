import express from 'express';
import {
  getAllThemes,
  getThemeBySlug,
  createTheme,
  deleteTheme
} from '../../services/themestore/themestore.controller'

const router = express.Router();

router.get('/', getAllThemes);
// @ts-ignore
router.get('/:slug', getThemeBySlug);
// @ts-ignore
router.post('/', createTheme);
// @ts-ignore
router.delete('/:slug', deleteTheme);

export default router;
