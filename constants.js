
const config = (() => {
    let fs = require('fs');
    try {
        let rawData = fs.readFileSync('../../.env', 'utf8');
        let envValues = {};
        let data = rawData.split("\n")
        .filter( function (rowStr) {

            return rowStr.includes('=') && !rowStr.includes('#');
        })
        .map( function (rawValue) {
            let row = rawValue.split("=");
            let value = row[1].split('"').join('');
            envValues[row[0]] = value;
        });

        return envValues;
    } catch(e) {
        console.log('Error:', e.stack);
    }

})();


module.exports = {
    // 2 minutes
    timeout: 120000,
    resolution: {
        width: 1920,
        height: 1080,
    },
    app_url: (() => {

        return config.APP_URL;
    })(),
    app_env: (() => {
        
        return config.APP_ENV;
    })(),
    scrape_price_limit: (() => {

        return config.CAR_SCRAPE_PRICE_LIMIT;
    })(),
    max_vehicle_to_process: (() => {

        return parseInt(config.MAX_VEHICLES_TO_PROCESS);
    })(),
    maximum_tabs: (() => {

        return parseInt(config.MAX_SCRAPER_BROWSER_TABS);
    })(),
    // Edge
    edge: {
        options: {
            mileage: {
                minimum: 0,
                maximum: 120000
            },
            grade: {
                minimum: '3.0',
                maximum: '5.0',
            },
            types: [
                {text: 'Dealer Pre-sale', value: '5', checked: true},
                {text: 'Public Pre-sale', value: '6', checked: true},
                {text: 'Factory Pre-sale', value: '7', checked: true},
                {text: 'Uncategorized Pre-sale', value: '8', checked: true},
                {text: 'Simulcast Only', value: '2', checked: true},
                {text: 'Buy Now', value: '3', checked: true},
                {text: 'Inventory (Not yet for sale)', value: '4', checked: false},
                {text: 'No-Sale Listings', value: '9', checked: false},
            ],
        },
        selectors: {
            class_logged_in: '.logged_in',
            login: {
                div_login_box: '#login_box',
                input_username: '#login_box #username',
                input_password: '#login_box #password',
                button_signin: '#login_box .button.sign_in'
            },
            search_build: {
                div_search: '#power_search',
                select_year_minimum: '#search_year_from-select',
                select_year_maximum: '#search_year_to-select',
                select_grade_minimum: '#search_grade_from-select',
                select_grade_maximum: '#search_grade_to-select',
                select_odometer_minimum: '#search_mileage_from-select',
                select_odometer_maximum: '#search_mileage_to-select',
                input_mmr_minimum: '#filters_mmr_from',
                checkbox_fuel_types: '.fuel_types input[type="checkbox"]',
                checkbox_types: '.types input[type="checkbox"]',
                button_search: 'input[name="run_search"]'
            },
            search_results: {
                div_search_results: '#search_results',
                p_pagination_stats: '.pagination_stats',
                div_vehicle: '#search_results .vehicle'
            },
            search_details: {
                h1_description: '#vdp .description',
                div_odometer: '.general-section .odometer',
                div_grade: '.general-section .grade .value',
                h3_company: '#auction_header .details h3.company',
                h4_location: '#auction_header .details h4',
                h5_phone: '#auction_header .details h5.phone',
                div_field_section_details: '.sections .section.details .content .field',
                span_slide_count: '.slide-actions .slide-counts',
                img_active: '.fotorama__active img',
                button_img_next: '.fotorama__arr.fotorama__arr--next',
            }
        },
    },
    // Carfax
    carfax: {
        zip: 10019,
        selectors: {
            sign_in: {
                logout: '#header-logout',
                header_sign: '#header-signin',
                input_email: '#userAuthenticationCombo #sign-in-form-sign-in-email',
                input_password: '#userAuthenticationCombo #sign-in-form-sign-in-password',
                button_login: '#userAuthenticationCombo button.sign-in-modal__content__input-button--log-in'
            },
            car_for_sale: {
                search_form_tab: '#searchForm-tabs',
                // step 1
                li_body_type_panel: '#bodyTypePanel-label',
                select_body_type: 'select[name="bodytypes"]',
                select_price_max: 'select[name="priceMax"]',
                input_zip: 'input[name="zip"]',
                button_submit: '#bodyType-form-submit',
                // step 2
                checkbox_input_no_accidents: 'input[name="noAccidents"]',
                checkbox_input_one_owner: 'input[name="oneOwner"]',
                checkbox_input_personal_use: 'input[name="personalUse"]',
                checkbox_input_service_records: 'inputp[name="serviceRecords"]',
                button_search_results: 'button.show-me-search-submit',
                span_total_record_text: 'span.totalRecordsText',
                checkbox_list: '.four-pillar-form .checkbox-list li'
            },
            search_results: {
                span_total_results_count: '#totalResultCount',
                select_minimum_year: '#minYear-range-select',
                select_maximum_year: '#maxYear-range-select',
                article_vehicle: '.srp-list-container article.srp-list-item',
                h4_vehicle_title: '.srp-list-item-basic-info-model',
                a_vehicle_link: '.srp-list-item-description a',
                span_total_result_count: '#totalResultCount',
                button_pagination_next: '.pagination-results button.pagination__button.pagination__button--right',
                span_vehicle_price: '.srp-list-item-price',
                span_photo_count: '.photoCount-listings',
            },
            search_details: {
                div_image_container: '.vdp-image-container',
                h1_vehicle_title: '.vehicle-title',
                li_vehicle_info_items: '.vehicle-info-ul .vehicle-info-list-items',
                div_vehicle_info_details: '.vehicle-info-details',
                div_dealer_info_location_raw: '.dealer-info-column .dealer-address',
                div_vehicle_info_location_container: '.vdp-container.vdp-info:eq(0)',
                div_dealer_info_phone: '.dealer-phone .dealer-info__section .dealer-info__phone-text',
                div_dealer_info_name: '.dealer-name',
                img_container: '.vdp-image-container img',
                button_gallery_next: '.slick-arrow.slick-next',
                div_slide: '.slick-list:first .slick-slide',
                modal_div_slide: '#galleryModal .slick-list:first .slick-slide',
            }
        },
        options: {
            body_type_values: [
                'Chassis',
                'Convertible',
                'Coupe',
                'Hatchback',
                'Minivan',
                'Pickup',
                'SUV',
                'Sedan',
                'Van',
                'Wagon',
            ],
            max_limit_per_body_type: 5000, // 5000 vehicles per body type
        }
    },
    // Enterprise
    enterprise: {
        base_url: (() => {

            return config.ENTERPRISE_BASE_URL;
        })(),

        api_url: (() => {

            return config.ENTERPRISE_API_URL;
        })(),

        buy_a_car_url: (() => {
            
            return config.ENTERPRISE_BUY_A_CAR_URL;
        })(),
        
        details_url: (() => {
            
            return config.ENTERPRISE_DETAILS_URL;
        })(),
        
        zip: (() => {

            return config.ENTERPRISE_ZIP;
        })(),

        api_page_size: (() => {

            return parseInt(config.ENTERPRISE_PARAMS_PAGE_SIZE);
        })(),

        max_age: (() => {
            
            return parseInt(config.ENTERPRISE_SCRAPER_MAX_AGE);
        })(),

        selectors: {
            modals: {
                page_invite: '#acsFocusFirst'
            },
            buy_a_car_page: {
                a_change_location: 'div[data-categoryname="Location"] a',
                button_locate: '#userlocation-form button[type="submit"]'
            },
            zip_code_page: {
                input_zip: 'input[name="zipCode"]',
                button_locate: '#a5-user-location-form .a5-manual-entry button[type="submit"]'
            },
            details_page: {
                section_gallery: '#image-gallery',
                img_thumbnail: '.image-gallery-thumbnails .image-gallery-thumbnail img',
                div_vehicle_pricing: '.vehiclePricing .pricing_value_1.value',
            }
        },
        feed_import_destination: (() => {

            return config.ENTERPRISE_FEED_IMPORT_DESTINATION;
        })(),
    },
    // Adesa
    adesa: {
        max_age: (() => {

            return config.ADESA_SCRAPER_MAX_AGE;
        })(),
        feed_import_destination: (() => {
            
            return config.ADESA_FEED_IMPORT_DESTINATION;
        })(),
        auth: {
            username: (() => {

                return config.ADESA_ACCOUNT_USERNAME;
            })(),
            password: (() => {

                return config.ADESA_ACCOUNT_PASSWORD;
            })(),
        },
        selectors: {
            login: {
                form: '#loginform',
                input_username: '#accountName',
                input_password: '#password',
                button_login: '#loginSubmit',
            },
            homepage: '#favorites-section',
            search: {
                anchor_vehicle_limit: '.nw-vehicle-page-limit .anchor',
                input_radio_vehicle_limit: 'input[data-a8n="page limit 100"]',
                div_vehicles: '#vehicleListing',
                div_vehicle_wrapper: '.vehicle-wrapper',
                div_vehicle: '.vehicle',
                b_price: '.price',
                b_price_label: '.db-label',
                div_vehicle_odometer: '.odometer',
                div_vehicle_transmission: 'div[id^="transmission"]:first',
                div_vehicle_engine: 'div[id^="engine"]:first',
                div_vehicle_drivetrain: 'div[id^="driveTrain"]:first',
                a_vehicle_link: '.vehicleLink',
                a_vehicle_link_image_loaded: '.vehicle-image.ng-lazyloaded',
                div_pagination: '.nw-pagination',
                ul_pagination: '.nw-pagination ul',
                li_pagination: '.nw-pagination ul li.inactive-page',
            },
            search_details: {
                div_vehicle_slider: '.nw-grid-slider',
                img_first_vehicle_slider: '.nw-grid-slider article img',
                modal_thumbnail_item: '.lg-thumb-item',
                modal_thumbnail_close: 'button.lg-close',
                button_buy_price: 'button[data-a8n="db-buy-now"]',
                button_bid_price: 'button[data-a8n="db-place-bid"]',
                span_location_city: 'span[data-a8n="location-city"]',
                span_location_state: 'span[data-a8n="location-state"]',
                span_location_city_state: 'span[data-a8n="vehicle-city-state-location"]',
                div_exterior_color: 'div[data-a8n="Info-ExtColor"]',
                div_exterior_color_attr: 'info-extcolor-value',
                div_interior_color: 'div[data-a8n="Info-IntColor"]',
                div_interior_color_attr: 'info-extcolor-value',
                div_info_odometer: 'div[data-a8n="Info-Odometer"]',
                div_info_odometer_attr: 'odometer-value',
                p_info_body_style: 'p[data-a8n="Body Style Value"]',
                p_info_fuel_type: 'p[data-a8n="Fuel Type Value"]',
                p_info_doors_value: 'p[data-a8n="Doors Value"]',
                span_stock_no: 'span[data-a8n="vdp-header-stock"]',
                span_damages: '.navigate-to-damage',
            }
        },
        urls: {
            login: 'https://buy.adesa.com/',
            base: 'https://openauction.prod.nw.adesa.com',
            search: {
                index: 'https://openauction.prod.nw.adesa.com/mfe/search?',
                variables: {
                    page: 'results',
                    auctionChannel: 'all',
                    vehicleType: 'all',
                    odometer: '0-120000',
                    proximity: '3000',
                    grade: '2.5-5',
                    zipcode: '14580'
                }
            }
        },
    },
    urls: {
        jquery: 'https://code.jquery.com/jquery-3.2.1.min.js',
    },
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
    image: {
        base64_data: 'iVBORw0KGgoAAAANSUhEUgAAAUAAAADwBAMAAACDA6BYAAAAMFBMVEUAAACHh4fExMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKW9M+AAAACXBIWXMAAAsTAAALEwEAmpwYAAADM0lEQVR4AezOgQAAAAjAsFK5P2QgbQQbAAAAAAAAAAAAAN7bSlBQUFDw2LXDnLdBGADDgRMYnwB8/0Nurb1XUKVaNg2CtPjHlzjxlEekAaedh5rJz00xK3GkmFmTSJKyH9VlHfD1V81ewuybMLwiSs2iSjjXVgLTG9ASKKc6g6wFMM7VhcAYrtiIH0RL5sDEqXXAMWqHYMhIyawuBDa/bHsfa46QI4VC31kJoJq1+LsIyKa7PLLqpxrOw7jRq4CB8Sw7pqgATN2dFmRxcCmwAYzIAKPehAJdCZRzYLIBeHwC60IgF0wAiz+qbgYILN8JhDcC1YHEnUC1C8B2HzDZ3sBYLUreFqisaucPCXEPkGMA+2lmB2AKkn6ZqHcDni91Re4E0hB8Ngv9ObkLGKSkQ7ul5pVGdudDQtTvDWu7Eag2KAZg6ux3ryQlgNlBSiXvJPeuxfXo35oaLSCDeRvQ0xLn4sW961EL7/R7xd8O2wO0Int/2cRKsi2QaHsCFWDdE5gAHpuGstDtGklts7n5iSeeeOKJJ554Yvfes1z82f3CF4KJin8JtLY70OruQNseKLsD66ZAdtquQF4ltwbmT2DSmBzJmpwBk5/gN9syCZgAGnlciMw6YO6eKt+Lg1aXANP47YtaeAFaKAw6/6jMusWNA4jM4mSEeKHXVep8n2TWQ1LHgTy7cg0gXw5SRzIJWMaJOsd/6wkuWXMgA5jGn8OwT1/qlBvudxV1AH3XE4Y/45zfLEQa29xxPenufcWpAdNJQA7A9GvBOKyIYzjPB4OyicB2AszDlTkEof/kMqx5frPAJbiydMCT7pGyqUC7DmS8CcpmdTPKI3gNaJ9AmQpkabgOlKVAnr3rwLo1sF+5CR6SycDv04wWcWD9VdABKVsKVICsK5k5j0H7AOocoAE8X+qC0y9rmHIrHWxau2X1W7PABmA26thMaxYI+dpu0UcxnJhpviibB/x9w9oAxs2lTrpkFvAPWn42Q12eDJTrL00UjnVRNbvd+v7aKd0sR9rVJd+fAOTl+/KLO7PeUJfe+wD/5/jRHhwTAAAAAAzp33oldmIGAAAAAAAAAAAAAAAAATWgPUYJ011oAAAAAElFTkSuQmCC' // ony the base64 data, without "data:image/png;base64,"
    }
  }