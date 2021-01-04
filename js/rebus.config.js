var rebus = rebus || {};

/*
    pages - page:
        path: String - a path relative to the current page; e.g. 'p1', '../p1' (go back), '/p2' (go to root)
        title: String
        hideHeader: Boolean
        hideHeaderTitle: Boolean
        redirectIfTopicComplete: String - a path, relative to the original page, to redirect to if the topic is complete
                                          e.g. a module assessment may redirect to the module completion page
        markCourseAsComplete: Boolean - Put on completion page of the last module if "takeModulesInOrder: true";
                                        otherwise the course will be set as complete when all modules are complete
*/
rebus.config = {
  title: 'Better Decisions for a Better Future', // Used my progress modal
  id: 'bdbf', // Used for generating a unique cookie for local testing
  useLMS: false,
  debug: true,
  debugTypes: '*',
  takeModulesInOrder: false,
  takeTopicsInOrder: false,
  takePagesInOrder: true,
  includeProgressModal: false,
  videosMustBePlayedThrough: false,
  useDefaultPDFViewerForBrowser: false,
  mozillaPDFViewerLinks: 'disabled', // 'disabled' | 'open-new-window'. If not set, they will be active and open in the current window.
  pages: [
      { path: 'welcome', title: 'Welcome', hideHeader: true },
      { path: 'helping-us-make-better-decisions', title: 'Helping us make better decisions', hideHeader: true },
      { path: 'video', title: 'Video', type: 'video', hideHeader: true },
      { path: 'course-menu', title: 'Course menu', hideHeader: true },
      {
          type: 'modules',
          modules: [
              {
                  folder: 'm1',
                  title: 'Better decisions when working with our people',
                  pages: [
                      { path: '../course-tips', title: 'Module tips', hideHeaderTitle: true },
                      { path: '../audio-preferences', title: 'Audio preferences', hideHeaderTitle: true },
                      { path: 'video', title: 'Introduction video', type: 'video', hideHeaderTitle: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeaderTitle: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'We value and respect people',
                                  pages: [
                                      { path: 'p1', title: 'We treat people with courtesy and respect' },
                                      { path: 'p2', title: 'Harassment, discrimination and bullying' },
                                      { path: 'p3', title: 'We are diverse and inclusive' },
                                      { path: 'p4', title: 'We are diverse and inclusive (cont.)' }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'We do no harm',
                                  pages: [
                                      { path: 'p1', title: 'We promote a safe work culture' },
                                      { path: 'p2', title: 'We are proactive in identifying and communicating about risks' },
                                      { path: 'p3', title: 'Health and safety' },
                                      { path: 'p4', title: 'We support each other' },
                                      { path: 'p5', title: 'We have a responsibility to not cause harm in our communities' },
                                      { path: 'p6', title: 'Alcohol and other drugs' }
                                  ]
                              },
                              {
                                  folder: 't3',
                                  title: 'We are accountable',
                                  pages: [
                                      { path: 'p1', title: 'We operate within the law' },
                                      { path: 'p2', title: 'We ensure our people are properly trained' },
                                      { path: 'p3', title: 'We prevent damage to our business' },
                                      { path: 'p4', title: 'We prevent damage to our business', htmlTitle: 'We prevent damage to our business (cont 1)' },
                                      { path: 'p5', title: 'Social media' },
                                      { path: 'p6', title: 'We prevent damage to our business', htmlTitle: 'We prevent damage to our business (cont 2)' }
                                  ]
                              }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeaderTitle: true }
                  ]
              },
              {
                  folder: 'm2',
                  title: 'Better decisions when helping our customers',
                  pages: [
                      { path: '../course-tips', title: 'Module tips', hideHeaderTitle: true },
                      { path: '../audio-preferences', title: 'Audio preferences', hideHeaderTitle: true },
                      { path: 'video', title: 'Introduction video', type: 'video', hideHeaderTitle: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeaderTitle: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'We value our customers',
                                  pages: [{ path: 'p1', title: 'Our customers are at the centre of everything we do' }]
                              },
                              {
                                  folder: 't2',
                                  title: 'We delight our customers',
                                  pages: [
                                      { path: 'p1', title: 'We delight our customers' },
                                      { path: 'p2', title: 'We\'re always improving' }]
                              },
                              {
                                  folder: 't3',
                                  title: 'We protect our customers',
                                  pages: [
                                      { path: 'p1', title: 'We protect our customers\' Personal Information and its use' },
                                      { path: 'p2', title: 'Privacy' },
                                      { path: 'p3', title: 'We play our part in protecting the community' }
                                  ]
                              },
                              {
                                  folder: 't4',
                                  title: 'We are accountable',
                                  pages: [
                                      { path: 'p1', title: 'We work within the Law' },
                                      { path: 'p2', title: 'We make sure our people are properly trained' },
                                      { path: 'p3', title: 'We work within the Law when dealing with customers' }
                                  ]
                              }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeaderTitle: true }
                  ]
              },
              {
                  folder: 'm3',
                  title: 'Better decisions that protect our community and the environment',
                  pages: [
                      { path: '../course-tips', title: 'Module tips', hideHeaderTitle: true },
                      { path: '../audio-preferences', title: 'Audio preferences', hideHeaderTitle: true },
                      { path: 'video', title: 'Introduction video', type: 'video', hideHeaderTitle: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeaderTitle: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'We make a positive impact',
                                  pages: [
                                      { path: 'p1', title: 'We make a positive impact on our community' },
                                      { path: 'p2', title: 'We make a positive impact on the environment' },
                                      { path: 'p3', title: 'We make a positive impact on our stakeholders' },
                                      { path: 'p4', title: 'What do positive impacts look like?' },
                                      { path: 'p5', title: 'We\'re proactive in identifying and communicating risks' }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'We foster positive relationships',
                                  pages: [
                                      { path: 'p1', title: 'We engage the community and our stakeholders' },
                                      { path: 'p2', title: 'Working with the community' }
                                  ]
                              },
                              {
                                  folder: 't3',
                                  title: 'We do the right thing',
                                  pages: [
                                      { path: 'p1', title: 'We work within the Law' },
                                      { path: 'p2', title: 'We are transparent and accountable' }
                                  ]
                              }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeaderTitle: true }
                  ]
              },
              {
                  folder: 'm4',
                  title: 'Better decisions when engaging our partners',
                  pages: [
                      { path: '../course-tips', title: 'Module tips', hideHeaderTitle: true },
                      { path: '../audio-preferences', title: 'Audio preferences', hideHeaderTitle: true },
                      { path: 'video', title: 'Introduction video', type: 'video', hideHeaderTitle: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeaderTitle: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'We value our partners',
                                  pages: [
                                      { path: 'p1', title: 'We work well with others' },
                                      { path: 'p2', title: 'Gifts, Benefits and Hospitality' },
                                      { path: 'p3', title: 'We are fair and impartial when making decisions' },
                                      { path: 'p4', title: 'Conflicts of interest' }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'We protect our business',
                                  pages: [{ path: 'p1', title: 'We protect our brand' }]
                              }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeaderTitle: true }
                  ]
              },
              {
                  folder: 'm5',
                  title: 'Better decisions when running our business',
                  pages: [
                      { path: '../course-tips', title: 'Module tips', hideHeaderTitle: true },
                      { path: '../audio-preferences', title: 'Audio preferences', hideHeaderTitle: true },
                      { path: 'video', title: 'Introduction video', type: 'video', hideHeaderTitle: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeaderTitle: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'We protect our business',
                                  pages: [
                                      { path: 'p1', title: 'We protect our brand' },
                                      { path: 'p2', title: 'We use our assets and resources properly' },
                                      { path: 'p3', title: 'Fraud and Corruption' }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'We value our people and our customers',
                                  pages: [{ path: 'p1', title: 'We provide a great customer experience' }]
                              },
                              {
                                  folder: 't3',
                                  title: 'We work and manage responsibly',
                                  pages: [
                                      { path: 'p1', title: 'We make safety a priority' },
                                      { path: 'p2', title: 'Incident management' },
                                      { path: 'p3', title: 'Our processes help us make the right decisions' },
                                      { path: 'p4', title: 'We are financially responsible' }
                                  ]
                              },
                              {
                                  folder: 't4',
                                  title: 'We do things by the book',
                                  pages: [
                                      { path: 'p1', title: 'We work within the Law' },
                                      { path: 'p2', title: 'We\'re open and transparent' }
                                  ]
                              }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeaderTitle: true}//, markCourseAsComplete: true }
                  ]
              }
          ]
      }
  ]
};