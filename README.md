# DelightLoop API Documentation

Comprehensive API documentation for DelightLoop Campaign Service, built with [Mintlify](https://mintlify.com).

This documentation provides complete reference and guides for integrating with the DelightLoop API, including endpoints for managing contact lists, campaigns, recipients, gifts, and more.

## 📚 Documentation Structure

- **Getting Started**: Introduction, quickstart guide, authentication, and error handling
- **Concepts**: Pagination, rate limits, and webhooks
- **Use Cases**: Campaign workflows and contact import guides
- **API Reference**: Complete OpenAPI specification with interactive "Try it" panels

## 🚀 Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) package manager

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Install the [Mintlify CLI](https://www.npmjs.com/package/mint) globally:
```bash
npm i -g mint
# or
pnpm add -g mint
```

3. Run the development server:
```bash
mint dev
```

4. View your local preview at `http://localhost:3000` (or the port shown in the terminal).

## 📝 Making Changes

### Adding or Editing Content

- **Guide pages**: Edit `.mdx` files in the root directory (e.g., `authentication.mdx`, `errors.mdx`)
- **API documentation**: The API reference is auto-generated from `api/openapi.public.json`
- **Navigation**: Update `docs.json` to modify the sidebar structure
- **Configuration**: Edit `docs.json` for branding, colors, and site settings

### Updating the OpenAPI Specification

The OpenAPI spec is located at `api/openapi.public.json`. To update it:

1. Download the latest spec from the API endpoint
2. Run the deduplication script if needed:
```bash
node scripts/dedupe-openapi.mjs
```

## 🚢 Publishing Changes

This repository is connected to Mintlify for automatic deployments. Changes are deployed to production automatically after pushing to the `main` branch.

To set up the GitHub integration:
1. Install the Mintlify GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app)
2. Connect this repository to your Mintlify project

## 🛠️ Troubleshooting

- **Dev environment not running**: Run `mint update` to ensure you have the most recent version of the CLI
- **404 errors**: Make sure you are running `mint dev` in the folder containing `docs.json`
- **OpenAPI validation errors**: Check the OpenAPI spec with `mint openapi-check api/openapi.public.json`

## 📖 Resources

- [Mintlify Documentation](https://mintlify.com/docs)
- [DelightLoop Website](https://delightloop.com)
- [DelightLoop Dashboard](https://web.delightloop.ai)

## 📄 License

See [LICENSE](LICENSE) file for details.
