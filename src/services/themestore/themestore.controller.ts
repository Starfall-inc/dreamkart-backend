import { Request, Response } from 'express';
import Theme from '../../model/themestore/theme.model'

export const getAllThemes = async (_req: Request, res: Response) => {
  try {
    const themes = await Theme.find().sort({ createdAt: -1 });
    res.status(200).json(themes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch themes.', error: (err as Error).message });
  }
};

export const getThemeBySlug = async (req: Request, res: Response) => {
  try {
    const theme = await Theme.findOne({ slug: req.params.slug });
    if (!theme) return res.status(404).json({ message: 'Theme not found.' });
    res.status(200).json(theme);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch theme.', error: (err as Error).message });
  }
};

export const createTheme = async (req: Request, res: Response) => {
  try {
    const existing = await Theme.findOne({ slug: req.body.slug });
    if (existing) return res.status(409).json({ message: 'A theme with that slug already exists.' });

    const newTheme = new Theme(req.body);
    await newTheme.save();
    res.status(201).json({ message: 'Theme created successfully!', theme: newTheme });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create theme.', error: (err as Error).message });
  }
};

export const deleteTheme = async (req: Request, res: Response) => {
  try {
    const deleted = await Theme.findOneAndDelete({ slug: req.params.slug });
    if (!deleted) return res.status(404).json({ message: 'Theme not found to delete.' });
    res.status(200).json({ message: 'Theme deleted successfully.', theme: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete theme.', error: (err as Error).message });
  }
};
