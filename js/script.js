// View Model
function ViewModel() {
  // Api url
  const apiUrl = "http://vps.churrasco.digital:3000";

  // Cloudinary cloud name
  const cloudName = "daqgkhuzh";

  // Cloudinary upload preset
  const uploadPreset = "wje3akey";

  // Self reference
  var self = this;

  // Auth token observable
  self.authToken = ko.observable("");

  // Username observable
  self.username = ko.observable("");

  // Password observable
  self.password = ko.observable("");

  // Login error observable
  self.loginError = ko.observable("");

  // Remmeber observalbe
  self.remember = ko.observable(false);

  // Sku observable
  self.sku = ko.observable("");

  // Name observable
  self.name = ko.observable("");

  // Price observable
  self.price = ko.observable("");

  // Price observable
  self.currency = ko.observable("");

  // Products observables
  self.products = ko.observableArray([]);

  // load error observable
  self.error = ko.observable("");

  // loading observable
  self.isLoading = ko.observable(false);

  // Images observable
  self.productImages = ko.observableArray([]);

  // Select product observable
  self.selectedProduct = ko.observable(null);

  // Function to show differents screens
  self.showScreen = function (screenId) {
    // Here, we only update the visibility of the screens based on the screenId
    $(
      "#login-screen, #products-screen, #add-product-screen, #product-detail-screen"
    ).addClass("d-none");

    // Remove class
    $("#" + screenId).removeClass("d-none");
  };

  // Function for logout
  self.logout = function () {
    // Clear auth token in observable
    self.authToken("");

    // Remove the auth token from cookies
    Cookies.remove("authToken");

    // Show the login screen
    self.showScreen("login-screen");
  };

  // Function to check url
  function isValidUrl(url) {
    // Regular expression to check if the URL has a valid format
    const pattern = /^(http|https):\/\/[^ "]+$/;

    // Return
    return pattern.test(url);
  }

  // Function to check image
  function checkImage(url, callback) {
    // Check if the URL has a valid format
    if (!isValidUrl(url)) {
      // Use placeholder if the URL is not valid
      callback("https://placehold.co/600x400");

      // Return
      return;
    }

    // Attempt to load the image
    const img = new Image();

    // Use the provided URL if the image loads successfully
    img.onload = function () {
      callback(url);
    };

    // Use placeholder if there is a loading error
    img.onerror = function () {
      callback("https://placehold.co/600x400");
    };

    // Url
    img.src = url;
  }

  // Function to show product details
  self.showProductDetails = function (product) {
    self.selectedProduct(product);

    self.showScreen("product-detail-screen");
  };

  // Function to back to products screen
  self.back = function () {
    // Show the products screen
    self.showScreen("products-screen");

    // Load products
    self.loadProducts();
  };

  // Function to upload images to cloudinary
  async function uploadImage(file) {
    // Form data
    const formData = new FormData();

    // Append file
    formData.append("file", file);

    // Upload preset
    formData.append("upload_preset", uploadPreset);

    // Fetch
    try {
      // Response
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Data
      const data = await response.json();

      // Log
      console.log(data);

      // Return url
      return data.secure_url;
    } catch (error) {
      // Error
      console.error("Error al cargar la imagen a Cloudinary:", error);
    }
  }

  // Function for login
  self.login = function () {
    // Set loading
    self.isLoading(true);

    // Get username
    const username = self.username();

    // Get password
    const password = self.password();

    // Fetch
    $.ajax({
      url: `${apiUrl}/login`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username, password }),
      success: function (response) {
        // Get auth token
        self.authToken(response.token);

        // If "remember" is true, save the auth token in cookies
        if (self.remember()) {
          Cookies.set("authToken", response.token, { expires: 7 });
        }

        // Change the screen
        self.showScreen("products-screen");

        // Load products
        self.loadProducts();
      },
      error: function (xhr) {
        // Parse the message
        const message = JSON.parse(xhr.responseText);

        // Get error message
        self.loginError(message.msg);
      },
      complete: function () {
        // Set loading
        self.isLoading(false);
      },
    });
  };

  // Load products
  self.loadProducts = function () {
    // Set loading
    self.isLoading(true);

    // Fetch
    $.ajax({
      url: `${apiUrl}/products`,
      method: "GET",
      headers: { Authorization: `Bearer ${self.authToken()}` },
      success: function (products) {
        // Add an `imageUrl` observable for each product
        const productsWithImage = products.map((product) => {
          // Placeholder observable
          product.imageUrl = ko.observable("https://placehold.co/600x400");

          // Observable array for validated pictures
          product.verifiedPictures = ko.observableArray([]);

          // If the product has an image URL, check if it's valid
          if (product.pictures && product.pictures.length > 0) {
            product.pictures.forEach((pictureUrl) => {
              // Validate the image URL
              checkImage(pictureUrl, function (validUrl) {
                // Push the verified URL to the `verifiedPictures` array
                product.verifiedPictures.push(validUrl);
              });
            });

            // Check image
            checkImage(product.pictures[0], function (validUrl) {
              // Assign the verified URL
              product.imageUrl(validUrl);
            });
          }

          // Return
          return product;
        });

        // Assign products with `imageUrl`
        self.products(productsWithImage);
      },
      error: function () {
        // Error
        self.error("Failed to load products.");
      },
      complete: function () {
        // Set loading
        self.isLoading(false);
      },
    });
  };

  // Add products
  self.addProduct = async function () {
    // Set loading
    self.isLoading(true);

    // Files
    const files = document.getElementById("product-pictures").files;

    // Image urls
    const imageUrls = [];

    // for to push url to image urls
    for (let i = 0; i < files.length; i++) {
      // Url
      const url = await uploadImage(files[i]);

      // If url exists
      if (url) {
        // Push urls
        imageUrls.push(url);
      }
    }

    // Product data
    var productData = {
      pictures: imageUrls,
      SKU: $("#product-sku").val(),
      name: $("#product-name").val(),
      price: $("#product-price").val(),
      currency: $("#product-currency").val(),
      description: $("#product-description").val(),
    };

    // Fetch
    $.ajax({
      url: `${apiUrl}/addproduct`,
      method: "POST",
      headers: { Authorization: `Bearer ${self.authToken()}` },
      contentType: "application/json",
      data: JSON.stringify(productData),
      success: function () {
        // Show toast
        const toastEl = document.getElementById("product-toast");

        // Toast
        const toast = new bootstrap.Toast(toastEl);

        // Show
        toast.show();

        // Change the screen
        self.showScreen("products-screen");

        // Load products
        self.loadProducts();
      },
      error: function () {
        // Error
        self.error("Failed to add product.");
      },
      complete: function () {
        // Set loading
        self.isLoading(false);
      },
    });
  };
}

// Apply the bindings of the Knockout
ko.applyBindings(new ViewModel());

// Show the login screen
$(document).ready(function () {
  // Access to the view model
  const viewModel = ko.dataFor(document.body);

  // Check if the auth token is in the cookie
  const savedAuthToken = Cookies.get("authToken");

  // If there is a saved auth token
  if (savedAuthToken) {
    // Get Token
    viewModel.authToken(savedAuthToken);

    // Change screen
    viewModel.showScreen("products-screen");

    // Load products
    viewModel.loadProducts();
  } else {
    // If there is not token in the cookies show the login screen
    viewModel.showScreen("login-screen");
  }
});
