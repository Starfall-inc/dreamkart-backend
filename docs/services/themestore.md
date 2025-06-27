# Themestore Controller

This controller handles API requests related to themes available in the themestore. It interacts directly with the `Theme` model to perform CRUD operations.

## Public Methods

*   **`getAllThemes(_req: Request, res: Response): Promise<void>`**:
    Retrieves all themes from the themestore, sorted by creation date (newest first). Responds with a JSON array of themes or an error message.

*   **`getThemeBySlug(req: Request, res: Response): Promise<void>`**:
    Retrieves a single theme by its slug. Responds with the theme data or a 404 if not found.

*   **`createTheme(req: Request, res: Response): Promise<void>`**:
    Creates a new theme. Checks for existing themes with the same slug to prevent duplicates. Responds with a success message and the new theme, or an error if creation fails or a duplicate slug exists.

*   **`deleteTheme(req: Request, res: Response): Promise<void>`**:
    Deletes a theme by its slug. Responds with a success message and the deleted theme, or a 404 if the theme is not found.

## Usage

This controller is used to define the API endpoints for theme management. It directly handles incoming HTTP requests and sends back appropriate HTTP responses, acting as the interface between the client and the `Theme` model.
