const { validateContentReview } = require("../validators/review_validator");

module.exports = {
  async createContentReview(data) {
    const { draftPath, targetReader, publishChannel, claimLedger } = data;

    // Ingestion gate: validate required fields
    const { isValid, errors } = validateContentReview({
      draftPath,
      targetReader,
      publishChannel,
      claimLedger
    });

    if (!isValid) {
      throw new Error(`Invalid content review: ${errors.join(", ")}`);
    }

    // Proceed with creating the review
    return await this._createReview(data);
  }
};