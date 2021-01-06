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
  title: 'Better Decisions for a Better Future - Retail', // Used my progress modal
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
      {
          type: 'modules',
          modules: [
              {
                  folder: 'm1',
                  title: 'Better Decisions for a Better Future - Retail. Part 1.',
                  pages: [
                      { path: 'welcome', title: 'Welcome', hideHeader: true },
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeader: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'Diversity and Inclusion',
                                  pages: [
                                      { path: 'p1', title: 'Diversity and Inclusion', hideHeader: false }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'Work Health and Safety',
                                  pages: [
                                      { path: 'p1', title: 'Work Health and Safety', hideHeader: true }
                                  ]
                              },
                              {
                                  folder: 't3',
                                  title: 'Online Safety',
                                  pages: [
                                      { path: 'p1', title: 'Online Safety', hideHeader: true }
                                  ]
                              },
                              {
                                folder: 't4',
                                title: 'Social Media',
                                pages: [
                                    { path: 'p1', title: 'Social Media', hideHeader: true }
                                ]
                            },
                            {
                                folder: 't5',
                                title: 'Harassment, Discrimination and Bullying',
                                pages: [
                                    { path: 'p1', title: 'Harassment, Discrimination and Bullying', hideHeader: true }
                                ]
                            }
                          ]
                      },
                      { path: 'completion', title: 'Completion', type: 'completion', hideHeader: true }
                  ]
              },
              {
                  folder: 'm2',
                  title: 'Better Decisions for a Better Future - Retail. Part 2.',
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
              }
          ]
      }
  ]
};